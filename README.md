# tp-13-salas-consultas-web-mongodb
Buscar y consultar reservas desde la web y la API

Aplicación web y API REST desarrollada con Node.js, Express, EJS y MongoDB (Mongoose) para gestionar reservas de salas de estudio, incorporando búsqueda literal por estudiante, filtrado exacto por sala, ordenamiento y paginación compartidos entre la interfaz web y la API.

## 1. Instalación y ejecución

1. **Clonar el repositorio e instalar dependencias:**
    git clone <URL_DEL_REPOSITORIO>
   cd tp-13-salas-consultas-web-mongodb


2. **Verificar sintaxis y estructura:**
   npm run check

3. **Comprobar conexión a MongoDB Atlas:**
   node --env-file=.env scripts/comprobar-conexion.js


4. **Iniciar el servidor:**
   node --env-file=.env src/index.js
   La aplicación quedará disponible en `http://localhost:3000`.

## 2. Configuración sin secretos

El repositorio incluye el archivo `.env.example` con marcadores de referencia y excluye el archivo privado `.env` mediante `.gitignore`.

Crear un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:

PORT=3000
MONGODB_URI=mongodb+srv://<USUARIO>:<PASSWORD>@<CLUSTER>.mongodb.net/reservas_salas_u13?retryWrites=true&w=majority


- **Base de datos:** `reservas_salas_u13`
- **Colección:** `reservas`


## 3. Criterios de consulta permitidos

Tanto la vista web (`GET /reservas`) como el endpoint de consulta (`GET /api/reservas/consulta`) comparten la función `leerCriterios` y el método `buscar` del servicio, sin realizar llamadas HTTP internas.

| Criterio | Tipo | Predeterminado | Reglas de validación y comportamiento |
| :--- | :--- | :--- | :--- |
| `q` | `string` | `""` | Fragmento literal del nombre de `estudiante`. Se aplica `trim()`. Vacío significa todos. Máximo **60 caracteres**. Ignora mayúsculas/minúsculas (`$options: "i"`). Se escapan caracteres especiales (`+`, `[`, `.*`, etc.) para evitar inyección de expresiones regulares. |
| `sala` | `string` | `""` | Igualdad exacta por `sala` luego de aplicar `trim()`. Vacío significa todas. Máximo **80 caracteres**. |
| `orden` | `string` | `"estudiante"` | Valores permitidos: `estudiante` (A-Z), `personas-asc` (menor a mayor) o `personas-desc` (mayor a menor). Todos desempatan por `_id` ascendente (`_id: 1`). No admite valor vacío. |
| `pagina` | `number` | `1` | Número entero entre **1 y 1000**. |
| `limite` | `number` | `2` | Número entero entre **1 y 20**. |

### Validación de seguridad en parámetros
- Se rechazan con error **400** las claves desconocidas, parámetros repetidos (ej. `?q=ana&q=bruno`), tipos no textuales u operadores de MongoDB enviados por URL (ej. `?q[$ne]=`).
- Una consulta válida sin coincidencias o con una página por encima del total devuelve **200** (nunca `404`).

## 4. Búsqueda frente a filtro

En este proyecto se diferencian dos mecanismos de consulta que se combinan en el servidor:

- **Búsqueda (`q`):** Busca coincidencias **parciales** dentro del campo `estudiante` sin distinguir mayúsculas o minúsculas. Por ejemplo, `q=ana` coincide con `"Ana Alba"`, `"Ana Berta"`, `"Ana Clara"` y `"Ana Diana"`. Además, el texto ingresado se escapa carácter por carácter antes de armar la expresión regular en MongoDB para garantizar una coincidencia **literal** (ej. `q=A+B` encuentra a `"Carla (A+B)"` y `q=.*` no actúa como comodín).
- **Filtro (`sala`):** Evalúa una **igualdad exacta** sobre el campo `sala` luego de quitar espacios en los extremos (`trim()`). Por ejemplo, `sala=Sala Norte` devuelve únicamente reservas de esa sala, y `sala=Inexistente` devuelve 0 resultados con estado `200`.


## 5. Contratos de las rutas

### Rutas de consulta (TP 13)

#### `GET /api/reservas/consulta`
Ejecuta la consulta paginada y devuelve un objeto JSON:
- **Respuesta `200 OK`:**

  {
    "datos": [
        {
            "id": "6ae9........",
            "estudiante": "Ana Clara Diamante",
            "email": "diamenzo11@hotmail.com",
            "sala": "Sala Sur",
            "fecha": "2026-10-28",
            "turno": "Tarde",
            "personas": 4,
            "estado": "pendiente"
        }
    ],
    "pagina": 1,
    "limite": 2,
    "total": 6,
    "paginas": 3
  }
  ```
- **Respuesta `400 Bad Request`:** `{ "error": "Revisá los datos enviados.", "campos": [] }`

#### `GET /reservas`
Renderiza la vista HTML `reservas/lista.ejs` con:
- Formulario GET que conserva `q`, `sala`, `orden` y `limite` (al enviar reinicia `pagina` a `1`) y enlace **Limpiar** (`/reservas`).
- Tarjetas de reservas correspondientes a `resultado.datos` con acciones de detalle, edición, cambio de estado y eliminación.
- Controles de paginación (**Anterior** y **Siguiente**) generados con `URLSearchParams` conservando los criterios activos.
- Mensajes informativos para estado sin coincidencias (`total === 0`) y página fuera de rango (`total > 0` y `datos.length === 0`, con enlace directo a la página 1).
- **Respuesta `400 Bad Request`:** Renderiza página HTML de error con mensaje seguro y enlace al listado.

### Rutas heredadas (CRUD y API)

| Método | Ruta | Descripción | Respuesta esperada |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reservas` | Listado heredado con filtros opcionales `sala` y `orden`. | `200 OK` (Array JSON) / `400` |
| `GET` | `/api/reservas/:id` | Detalle de una reserva por ObjectId. | `200 OK` / `400` / `404` |
| `POST` | `/api/reservas` | Crea una nueva reserva. | `201 Created` + header `Location` |
| `PUT` | `/api/reservas/:id` | Reemplazo completo de una reserva (`estudiante`, `email`, `sala`, `fecha`, `turno`, `personas`, `estado`). | `200 OK` / `400` / `404` |
| `PATCH` | `/api/reservas/:id` | Actualización parcial (`personas` y/o `estado`). | `200 OK` / `400` / `404` |
| `DELETE` | `/api/reservas/:id` | Eliminación de una reserva por ID. | `204 No Content` / `400` / `404` |

---

## 6. Registro de pruebas


### Prueba 1: Misma consulta en Web y API
- **URL API:** `GET http://localhost:3000/api/reservas/consulta?q=ana&sala=Sala%20Norte&orden=personas-asc&pagina=1&limite=2` ( *** Evidencia: Fig 1 - Evidencia Api - Prueba1 *** )
- **URL Web:** `http://localhost:3000/reservas?q=ana&sala=Sala+Norte&orden=personas-asc&limite=2&pagina=1` ( *** Evidencia : Fig 2 - Evidencia Web - Prueba 1 *** )


### Prueba 2: Página siguiente conservando criterios
- **URL API:** `GET http://localhost:3000/api/reservas/consulta?q=ana&sala=Sala%20Norte&orden=personas-asc&pagina=2&limite=2` ( *** Evidencia: Fig 3 - Evidencia Api - Prueba 2 *** )
- **URL Web:** `http://localhost:3000/reservas?q=ana&sala=Sala+Norte&orden=personas-asc&limite=2&pagina=2` ( *** Evidencia : Fig 4 - Evidencia Web - Prueba 2 *** )


### Prueba 3: Caso literal con signos especiales
- **URL 3A (con coincidencia):** `GET http://localhost:3000/api/reservas/consulta?q=A%2BB` ( *** Evidencia :Fig 5 - Evidencia Api - Prueba 3 *** )
- **URL 3B (sin comodín regex):** `GET http://localhost:3000/api/reservas/consulta?q=.*` y `GET http://localhost:3000/api/reservas/consulta?q=[`
( *** Fig 6 - Evidencia Api Prueba 3 Vacio *** )


### Prueba 4: Página válida fuera de rango
- **URL API:** `GET http://localhost:3000/api/reservas/consulta?q=ana&sala=Sala%20Norte&pagina=3&limite=2`
- **URL Web:** `http://localhost:3000/reservas?q=ana&sala=Sala+Norte&pagina=3&limite=2`
- **Resultado:** Estado `200`, `total: 3`, `paginas: 2`, `pagina: 3`, `datos: []`. La vista web informa que la página está fuera de resultados y ofrece volver a la página 1 conservando los criterios.
- **Evidencia / Respuesta:**
  ```json
  // Pegar aquí la respuesta JSON o enlace a captura
  ```

### Prueba 5: Errores de entrada (400 JSON en API y 400 HTML en Web)
- **URLs probadas:**
  - `GET http://localhost:3000/api/reservas/consulta?pagina=0`
  - `GET http://localhost:3000/api/reservas/consulta?pagina=1.5`

### Prueba 6: Continuidad del CRUD y rutas heredadas

• Rutas heredadas: GET /api/reservas y GET /api/reservas/<ID_1> responden 200 OK manteniendo sus contratos originales.
• Ciclo CRUD sobre reserva adicional de prueba:
	1. Alta (POST /api/reservas o formulario web): Creada reserva de prueba con ID <ID_PRUEBA>.
	2. Edición completa (PUT /api/reservas/<ID_PRUEBA>): Actualizada correctamente (200 OK).
	3. Cambio parcial (PATCH /api/reservas/<ID_PRUEBA>): Actualizado estado a "confirmada" (200 OK).
	4. Borrado (DELETE /api/reservas/<ID_PRUEBA>): Eliminada (204 No Content), conservando intactos los 6 registros iniciales de consulta.


