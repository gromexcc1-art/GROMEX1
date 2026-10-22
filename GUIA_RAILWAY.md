# GROMEX 6.34 — Migración a Railway sin perder los datos

Este paquete conserva la aplicación Node.js y SQLite original. El ZIP de código **no incluye** información de clientes ni contraseñas. La base se entrega por separado en `GROMEX_DATOS_PRIVADOS.db`.

## Requisitos

- Cuenta en https://railway.com/ y un plan con volumen persistente.
- Node.js en la computadora (para instalar la CLI); Railway ejecutará Node 24.
- Railway CLI: `npm install -g @railway/cli`.
- Tener guardada la copia privada `GROMEX_DATOS_PRIVADOS.db` fuera de una carpeta pública o repositorio Git.

## Primer despliegue (PowerShell o terminal)

1. Descomprime `GROMEX_RAILWAY_CODIGO.zip` en una carpeta, por ejemplo `GROMEX_RAILWAY_CODIGO`.
2. Abre la terminal **dentro** de esa carpeta, donde está `package.json`.
3. Ejecuta `railway login` y completa el acceso en el navegador.
4. Ejecuta `railway init` y crea un proyecto llamado `gromex`.
5. Abre el panel de Railway y crea un **Empty Service** dentro del proyecto.
6. En la terminal ejecuta `railway link` y vincula ese servicio.
7. Ejecuta `railway volume add --mount-path /data` y elige el servicio de GROMEX. Confirma en el panel que el volumen pertenece al servicio correcto.
8. Antes del primer arranque, sube la base a la **raíz de ese volumen**:

   `railway volume files upload "RUTA_COMPLETA_A_GROMEX_DATOS_PRIVADOS.db" /gromex.db`

   El comando puede pedir elegir el volumen. **No añadas `--overwrite` ni sustituyas una base ya usada en producción.**
9. Comprueba el archivo con `railway volume files list /` y confirma que aparece `gromex.db`.
10. Desde la carpeta que contiene `package.json`, ejecuta `railway up` y selecciona el servicio GROMEX.
11. En el panel del servicio, abre **Settings > Networking > Generate Domain** para obtener una dirección `*.up.railway.app`.
12. Comprueba `https://TU_DOMINIO.up.railway.app/api/health` (debe responder `ok: true`) y luego la página principal. Prueba el acceso con un usuario EXISTENTE.

## Protección contra pérdida de datos

- Al conectarle el volumen, Railway define `RAILWAY_VOLUME_MOUNT_PATH` automáticamente. El inicio de GROMEX utilizará `/data/gromex.db`.
- Si no hay volumen o no existe la base, el servidor se niega a arrancar para evitar crear una base vacía por error.
- Los siguientes despliegues con `railway up` **no reemplazan** la base de datos en el volumen.
- Configura **una sola instancia** de la aplicación mientras utilices SQLite.
- Programa respaldos de SQLite y del volumen. Antes de cambios importantes, apaga temporalmente las escrituras y descarga una copia coherente. No descargues solo un archivo `.db` si hay transacciones WAL pendientes.
- No publiques archivos `.db`, `-wal`, `-shm` ni contraseñas en GitHub, `htdocs` o páginas públicas.

## Notas

- El subdominio gratuito `gomex.byethost9.com` pertenece a ByetHost; no se transfiere automáticamente a Railway. Usa el dominio de Railway o un dominio propio que controles.
- Si Railway marca error al crear el volumen, revisa el plan contratado y las limitaciones vigentes.
- No se convirtió SQLite a MySQL: para esta migración **no necesitas importar el archivo SQL**.
- No hemos publicado el servicio ni migrado datos a una cuenta externa; esos pasos se hacen desde tu cuenta de Railway.
