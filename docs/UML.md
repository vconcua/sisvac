# Diagramas UML de SISVAC

Fuentes Mermaid en `docs/uml/*.mmd` y imágenes PNG renderizadas junto a ellas. GitHub renderiza los bloques de abajo directamente.

## Casos de uso

![Casos de uso](uml/casos_uso.png)

```mermaid
flowchart LR
A((Administrador)) --- U1[Gestionar usuarios y catálogos]
A --- U2[Reportes y exportación PDF/Excel]
PS((Personal de salud)) --- U3[CRUD comunidades, padres y niños]
PS --- U4[Registrar crecimiento y ver curvas OMS]
PS --- U5[Aplicar vacunas]
PS --- U6[Campañas segmentadas]
EN((Enfermería)) --- U4
EN --- U5
EC((Encargado/Consulta)) --- U2
EC --- U7[Ver alertas y niños]
PA((Padre/Madre)) --- U8[Ver carnet con QR + PIN + DPI]
U4 -.incluye.-> U9[Calcular percentil y generar alerta]
U9 -.incluye.-> U10[Notificar por canal preferido]
```

## Diagrama de clases

![Diagrama de clases](uml/clases.png)

```mermaid
classDiagram
direction TB
class Usuario { +UUID id; +string nombre_completo; +string correo; +string password_hash; +Rol rol; +bool activo }
class CentroSalud { +int id; +string nombre; +string tipo }
class Comunidad { +UUID id; +string nombre; +int numero_estimado_familias }
class Padre { +UUID id; +string nombre_completo; +string dpi (cifrado); +string dpi_hash; +string telefono; +string correo; +string telegram_chat_id; +Canal canal_preferido; +int login_intentos_fallidos }
class Ninio { +UUID id; +string nombre_completo; +date fecha_nacimiento; +Sexo sexo; +UUID qr_codigo; +string qr_pin; +int qr_intentos_fallidos; +bool activo }
class RegistroCrecimiento { +date fecha_medicion; +decimal peso_kg; +decimal talla_cm; +decimal edad_meses_al_medir; +decimal percentil_peso; +decimal percentil_talla }
class Vacuna { +string nombre; +int edad_recomendada_meses; +int dosis_numero }
class Vacunacion { +date fecha_aplicada; +date fecha_proxima_dosis; +Estado estado }
class Alerta { +Tipo tipo (preventiva|critica); +string motivo; +string mensaje; +Estado estado }
class Notificacion { +Canal canal; +string asunto; +string contenido; +Estado estado; +datetime enviado_en }
class Campania { +string titulo; +string mensaje; +int edad_min_meses; +int edad_max_meses; +Estado filtro_estado }
class Percentiles { <<servicio OMS LMS>> +percentilPeso(); +percentilTalla(); +curvaReferencia() }
class Notificador { <<servicio>> +enviarPorCanal(); +resolverDestino() }
class CarnetService { <<servicio>> +generarQR(); +consultarCarnet(); +enviarCarnet() }
CentroSalud "1" --> "*" Comunidad
Comunidad "1" --> "*" Padre
Comunidad "1" --> "*" Ninio
Padre "*" -- "*" Ninio : ninio_padre (parentesco)
Ninio "1" --> "*" RegistroCrecimiento
Ninio "1" --> "*" Vacunacion
Vacuna "1" --> "*" Vacunacion
Ninio "1" --> "*" Alerta
Alerta "1" --> "*" Notificacion
Padre "1" --> "*" Notificacion
Campania "*" --> "0..1" Comunidad
Usuario "1" --> "*" RegistroCrecimiento : registra
Usuario "1" --> "*" Vacunacion : aplica
Usuario "1" --> "*" Campania : crea
RegistroCrecimiento ..> Percentiles : usa
Alerta ..> Notificador : usa
CarnetService ..> Ninio
```

## Modelo entidad-relación

![Modelo entidad-relación](uml/er.png)

```mermaid
erDiagram
CENTROS_SALUD ||--o{ COMUNIDADES : atiende
COMUNIDADES ||--o{ PADRES : tiene
COMUNIDADES ||--o{ NINIOS : tiene
PADRES }o--o{ NINIOS : ninio_padre
NINIOS ||--o{ REGISTROS_CRECIMIENTO : mide
NINIOS ||--o{ VACUNACIONES : recibe
VACUNAS ||--o{ VACUNACIONES : catalogo
NINIOS ||--o{ ALERTAS : genera
ALERTAS ||--o{ NOTIFICACIONES : origina
PADRES ||--o{ NOTIFICACIONES : recibe
COMUNIDADES ||--o{ CAMPANIAS : segmenta
USUARIOS ||--o{ REGISTROS_CRECIMIENTO : registra
USUARIOS ||--o{ CAMPANIAS : crea
```

## Secuencia – registrar medición, alerta y notificación

![Secuencia – registrar medición, alerta y notificación](uml/sec_medicion.png)

```mermaid
sequenceDiagram
actor PS as Personal de salud / Enfermería
participant FE as Frontend React
participant API as API Express
participant P as Percentiles OMS
participant DB as PostgreSQL
participant N as Notificador
participant SNS as AWS SNS
actor Pa as Padre/Madre
PS->>FE: Registra peso y talla
FE->>API: POST /api/crecimiento (JWT)
API->>API: autenticar + autorizar(A, PS, EN)
API->>P: percentilPeso/Talla(sexo, edad en meses)
P-->>API: percentiles (método LMS)
API->>DB: INSERT registros_crecimiento
alt percentil < 5 o > 95
API->>DB: INSERT alertas (preventiva / crítica si < 3)
API->>N: enviarPorCanal(canal preferido del padre)
N-->>Pa: Email / Telegram / WhatsApp / SMS
API->>DB: INSERT notificaciones
opt alerta crítica
API->>SNS: publicar alerta
end
end
API-->>FE: 201 registro + percentiles
FE-->>PS: Gráfica OMS actualizada
```

## Secuencia – acceso al carnet digital (QR + PIN + DPI)

![Secuencia – acceso al carnet digital (QR + PIN + DPI)](uml/sec_carnet.png)

```mermaid
sequenceDiagram
actor Pa as Padre/Madre
participant FE as Carnet.jsx
participant API as API Express
participant DB as PostgreSQL
participant S3 as AWS S3
Note over API,S3: Al registrar el niño: se genera qr_codigo (UUID) + PIN de 6 dígitos y se guarda el PNG del QR en S3 (qr/)
Pa->>FE: Escanea el QR (/carnet/:codigo)
FE->>API: GET /api/carnet/:codigo/acceso
API->>DB: ¿niño con padres vinculados?
API-->>FE: { requiere_dpi }
Pa->>FE: Ingresa PIN y DPI
FE->>API: POST /api/carnet/:codigo {pin, dpi}
API->>DB: ¿bloqueado hasta?
alt bloqueado
API-->>FE: 429 intente más tarde
else PIN y DPI correctos
API->>DB: reinicia intentos
API-->>FE: 200 carnet (crecimiento + vacunas)
else incorrectos
API->>DB: intentos + 1 (5 intentos = 15 min)
API-->>FE: 401 PIN o DPI incorrectos
end
```

## Secuencia – avisos automáticos programados

![Secuencia – avisos automáticos programados](uml/sec_avisos.png)

```mermaid
sequenceDiagram
participant EB as AWS EventBridge (cron diario)
participant L as Lambda avisos
participant DB as PostgreSQL (RDS)
participant N as Notificador
participant SNS as AWS SNS
actor Pa as Padre/Madre
EB->>L: dispara ejecución
L->>DB: niños sin medición (0-2 años: 1 mes, 2-5 años: 3 meses)
L->>DB: vacunas pendientes / atrasadas
L->>DB: crea alertas (evita duplicados)
L->>N: enviar aviso por canal preferido
N-->>Pa: Email / Telegram / WhatsApp / SMS
L->>SNS: alertas críticas
L->>DB: registra notificaciones
```

## Arquitectura AWS

![Arquitectura AWS](uml/aws.png)

```mermaid
flowchart LR
U[Usuario web] --> CF[CloudFront + S3 frontend]
CF --> APIG[API Gateway]
APIG --> LA[Lambda API Express]
EB[EventBridge] --> LV[Lambda avisos]
LA --> RDS[(RDS PostgreSQL)]
LV --> RDS
LA --> S3[(S3 privado: qr/ y documentos/reportes)]
LA --> SNS[SNS alertas y SMS]
LV --> SNS
LA --> EXT[SMTP / Telegram / WhatsApp]
LV --> EXT
```
