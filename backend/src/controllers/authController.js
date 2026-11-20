const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { hashDeterminista } = require('../utils/cifrado');
require('dotenv').config();

// 'padre' no se crea aquí: los padres entran con DPI + PIN (loginPadre)
const ROLES_VALIDOS = ['administrador', 'personal_salud', 'encargado_centro', 'consulta_limitada', 'enfermeria'];

async function login(req, res) {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

    const { rows } = await db.query('SELECT * FROM usuarios WHERE correo = $1 AND activo = TRUE', [correo]);
    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, correo: usuario.correo, nombre: usuario.nombre_completo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre_completo, rol: usuario.rol, correo: usuario.correo } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
}

const MAX_INTENTOS_PADRE = 5;
const MINUTOS_BLOQUEO_PADRE = 15;

/**
 * Login de padres: el DPI está cifrado en la BD, así que se busca por su hash determinista.
 * Protección contra adivinar el PIN: tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
 * El mensaje de error es el mismo si el DPI no existe o el PIN es incorrecto (no revela qué DPI están registrados).
 */
async function loginPadre(req, res) {
  try {
    const { dpi, pin } = req.body;
    if (!dpi || !pin) return res.status(400).json({ error: 'DPI y PIN son requeridos' });

    const { rows } = await db.query('SELECT * FROM padres WHERE dpi_hash = $1', [hashDeterminista(String(dpi).trim())]);
    const padre = rows[0];
    if (!padre) return res.status(401).json({ error: 'DPI o PIN incorrectos' });

    if (padre.login_bloqueado_hasta && new Date(padre.login_bloqueado_hasta) > new Date()) {
      return res.status(429).json({ error: `Demasiados intentos fallidos. Intente de nuevo en ${MINUTOS_BLOQUEO_PADRE} minutos.` });
    }

    const { rows: ninios } = await db.query(
      `SELECT n.* FROM ninios n
       JOIN ninio_padre np ON np.ninio_id = n.id
       WHERE np.padre_id = $1 AND n.qr_pin = $2 AND n.activo = TRUE`,
      [padre.id, String(pin).trim()]
    );
    if (ninios.length === 0) {
      const { rows: r } = await db.query(
        `UPDATE padres SET login_intentos_fallidos = login_intentos_fallidos + 1,
           login_bloqueado_hasta = CASE WHEN login_intentos_fallidos + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE login_bloqueado_hasta END
         WHERE id = $1 RETURNING login_intentos_fallidos`,
        [padre.id, MAX_INTENTOS_PADRE, String(MINUTOS_BLOQUEO_PADRE)]
      );
      const restantes = Math.max(0, MAX_INTENTOS_PADRE - r[0].login_intentos_fallidos);
      return res.status(401).json({
        error: restantes > 0 ? `DPI o PIN incorrectos. Le quedan ${restantes} intento(s).` : `DPI o PIN incorrectos. Cuenta bloqueada por ${MINUTOS_BLOQUEO_PADRE} minutos.`,
      });
    }
    if (padre.login_intentos_fallidos > 0 || padre.login_bloqueado_hasta) {
      await db.query('UPDATE padres SET login_intentos_fallidos = 0, login_bloqueado_hasta = NULL WHERE id = $1', [padre.id]);
    }

    const token = jwt.sign({ id: padre.id, rol: 'padre' }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, padre: { id: padre.id, nombre: padre.nombre_completo }, ninios });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
}

/** Lista todas las cuentas del sistema (nunca devuelve contraseñas). Solo administrador. */
async function listarUsuarios(req, res) {
  const { rows } = await db.query(
    `SELECT id, nombre_completo, correo, rol, centro_salud, activo, creado_en FROM usuarios ORDER BY creado_en DESC`
  );
  res.json(rows);
}

async function crearUsuario(req, res) {
  try {
    const { nombre_completo, correo, password, rol, centro_salud } = req.body;
    if (!nombre_completo || !nombre_completo.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return res.status(400).json({ error: 'Correo inválido' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: `Rol inválido. Opciones: ${ROLES_VALIDOS.join(', ')}` });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO usuarios (nombre_completo, correo, password_hash, rol, centro_salud)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_completo, correo, rol`,
      [nombre_completo.trim(), correo, hash, rol, centro_salud || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El correo ya está registrado' });
    res.status(500).json({ error: 'Error al crear usuario', detalle: error.message });
  }
}

module.exports = { login, loginPadre, crearUsuario, listarUsuarios };
