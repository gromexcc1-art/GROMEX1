# CC GROMEX · Sistema integral con SQLite

## Actualización 6.34

Captura de números con comas, gastos vigentes y anulados en tablas separadas, botones de regreso, iconos renovados y preferencias de navegación y ayudas por usuario. Consulta **ACTUALIZACION-634.md** para instalar conservando tu base de datos.

### Cambios de la versión anterior (6.32)

- Meta y costo estimado por producto; cantidad automática al crear órdenes.
- Margen de utilidad en pesos y porcentaje.
- Gastos variables con concepto, importe y observaciones; fecha y reparto automáticos.
- Revisión del cierre mensual por otro administrador.
- Traspasos con envío inicial en cero y edición administrativa que reabre la solicitud.
- Modo Luz del sol y textos más sencillos.
- Excedentes confirmados como saldo a favor del cliente, utilizable en otras ventas sin duplicar cobros.

Versión **6.34.0**. Consulta `ACTUALIZACION-634.md` para el uso y la instalación conservando tus datos.

## Cambios 6.31.1

- Tabla de costos indirectos fijos con sus campos originales, sin la columna «Fijo desde».
- Gastos variables colocados inmediatamente debajo de los costos indirectos.

## Cambios 6.31

- Gastos variables con fecha, categoría, clasificación, importe y piezas restantes previstas; acumulación desde su aplicación hasta fin de mes.
- Absorción según producción terminada, con tope por gasto y saldo pendiente visible. No modifica precios de venta.
- Gráfica y tabla diarias por producto: costo base, variable, referencia y costo real registrado.
- Conversión a fijo mensual desde el siguiente mes, con trazabilidad y sin duplicar la carga del gasto variable.
- Desglose en órdenes, reporte mensual de producción, reporte financiero, historial de cambios y cierre de mes; PDF y Excel.

La guía `ACTUALIZACION-GASTOS-VARIABLES.md` describe el historial del cambio 6.31; la captura simplificada vigente está documentada en `ACTUALIZACION-632.md`.

## Cambios v6.30

- Diseño unificado para todos los PDF: encabezados GROMEX, tablas legibles, totales destacados, fecha de generación y paginación.
- Exportaciones Excel reales `.xlsx`, con filtros, encabezados inmovilizados, importes y fechas, hojas por sección y totales filtrables donde corresponde.
- Productos y fórmulas con tarjetas adaptables y recursos de costeo organizados sin desplazamiento horizontal, incluido el editor en teléfono.

Consulta `ACTUALIZACION-REPORTES-CATALOGO.md` para los cambios de presentación de esa versión.

## Cambios v6.29

- Alertas interactivas de materiales y productos por almacén desde Resumen, filtro de stock bajo en Inventario y mínimo configurable por producto.
- Botón de modo oscuro con colores GROMEX y preferencia conservada en este navegador y sus pestañas.
- Iconos SVG Lucide locales en indicadores, acciones, ventanas y navegación; incluye licencia.
- Gastos adicionales del cierre capturados en tabla: artículo, cantidad, costo sin IVA y casilla IVA (16%). Totales sin IVA, IVA y total con IVA, calculados por el servidor.
- Se retiran caja/bancos y saldo comprobado del formulario y de la impresión; las versiones antiguas conservan internamente su información original.
- PDF del reporte mensual de cambios con resumen, áreas, filtros y detalle, encabezados repetidos y páginas numeradas.

Consulta `ACTUALIZACION-STOCK-TEMA-GASTOS.md`.



## Cambios v6.28: Reporte de fin de mes y barra compacta

- Nuevo módulo independiente **Reporte de fin de mes**, sin reemplazar el reporte mensual de cambios.
- Resumen, comparación con el mes anterior, ventas, cobros, cartera al corte, inventario, entregas, traspasos, producción y costos.
- Captura opcional de conteos físicos, diferencias, mermas, caja/bancos, gastos adicionales y observaciones.
- Cortes históricos desde la instalación, versiones inmutables, motivo de corrección y revisión con responsable y fecha.
- Impresión/PDF A4 por secciones, tablas, indicadores, colores sobrios y numeración de páginas en navegadores compatibles.
- Iconos SVG Lucide locales, con sus licencias. La barra de escritorio se reduce a 78 px y conserva los accesos; el menú móvil mantiene su apertura y cierre anteriores.

## Cambios v6.27: historial mensual y tipos de cliente

- Reportes → Reporte mensual de cambios: mes, área, responsable, búsqueda, CSV e impresión/PDF.
- Historial permanente generado por el servidor: fecha/hora de México, responsable, almacén, dato anterior y nuevo.
- Registra inventario y movimientos (incluye entregas y traspasos), precios, costos de materiales, fórmulas, costos estándar calculados, indirectos, clientes, catálogo, almacenes y producción.
- El historial detallado comienza al instalar esta versión; no atribuye responsables ni horas a cambios anteriores.
- Permiso separado de historial mensual global, habilitado inicialmente para Administración.
- Clientes: Público general, Casas materialistas u Obras completas; filtro por tipo y tarifa inicial automática en cotizaciones y ventas directas.
- Las operaciones guardadas conservan sus partidas y precios; el tipo se puede elegir también para clientes sin registrar.

## Cambios v6.26: animaciones discretas

- Entrada de módulos de 180 ms, con desplazamiento de solo 4 px.
- No se repite al buscar, filtrar, guardar o actualizar el mismo módulo.
- Apertura breve de ventanas; actualizar una ventana abierta no repite la animación.
- Botones, navegación y avisos con transiciones suaves, sin rebotes ni efectos continuos.
- Respeta la preferencia del equipo de reducir movimiento.

## Cambios v6.25: ventas directas y cliente sin registrar

- Ventas → Nueva venta: registra una venta confirmada directamente, sin cotización previa.
- Cotizaciones → Convertir en venta sigue disponible.
- Correo y dirección opcionales para clientes sin registrar, tanto en cotizaciones como en ventas. Solo el nombre es obligatorio entre los datos del cliente.
- Ventas directas con folio VEN; las propuestas y sus conversiones conservan COT.
- Pagos y entregas funcionan igual para ventas directas y convertidas.

## Cambios v6.24: Cotizaciones y Ventas separados

- Cotizaciones: preparar propuestas, buscar, editar, imprimir / PDF y cancelar.
- Convertir en venta con el mismo folio, cliente, cantidades y precios, sin duplicar registros.
- Ventas: únicamente operaciones concretadas y su historial; conserva pagos, entregas y filtros.
- Imprimir o convertir una propuesta no genera un cobro ni descuenta inventario.
- Permisos separados para Cotizaciones y Ventas; convertir requiere ambos.

Consulta `ACTUALIZACION-COTIZACIONES.md` para instalar y usar el nuevo flujo.

## Cambios v6.23: envíos parciales y varias pestañas

- Traspasos: aceptar y dejar pendiente para continuar enviando, o aceptar y finalizar con menos piezas.
- Historial por envío, saldo acumulado y protección contra duplicados y envíos excedidos.
- Ventas: permite surtir después del plazo programado, sin superar las piezas vendidas.
- Filtro de entrega en listado y seguimiento de ventas.
- Enlaces de módulos para abrir varias pestañas y botón Actualizar datos.
- Los traspasos parciales cerrados de versiones anteriores conservan su cierre.

## Cambios v6.22: inventario compartido y entregas

- Materiales con existencia compartida; blocks separados por almacén.
- Administración de almacenes: alta, cambio de nombre, eliminación del uso diario y restauración, solo para el administrador.
- Ventas con Sin entregar, Entrega parcial y Entregado; periodos, capturas parciales, historial y descuento del almacén seleccionado.
- Validación de saldo de la venta, inventario, permisos, concurrencia y reintentos.
- Traspasos del administrador inmediatos; cancelación de solicitudes exclusiva del administrador.
- Entradas y salidas de traspasos visibles en el buscador con almacenes, usuarios y folio.

Lee `ACTUALIZACION-ENTREGAS.md` para instalación, uso, reglas de migración y pruebas.

## Historial v6.21: almacenes y solicitudes (reglas actualizadas en v6.23)

- Inventario separado por almacén para productos y materiales. El saldo anterior y los usuarios existentes se asignan inicialmente a **Almacén principal**. No se reconstruye una distribución histórica que la base anterior no registraba.
- En **Inventario → + Almacén** el administrador registra almacenes. En **Administración → Usuarios** asigna uno a cada usuario y activa o desactiva la consulta de otros almacenes. Consultar otro almacén no permite mover sus existencias.
- En **Inventario → Traspasos de inventario**, un usuario de Almacén solicita piezas para su almacén a otro almacén. El responsable del almacén que entrega, o un administrador distinto del creador, acepta y ajusta las cantidades.
- Las solicitudes no reservan existencias. Al crear y aceptar se valida el saldo disponible; la aceptación mueve ambas existencias en una sola transacción. Una aceptación parcial cierra la solicitud con lo efectivamente transferido. Solo se cancelan solicitudes pendientes.
- Reporte individual con folio, almacenes, comentarios, cantidades solicitadas y transferidas, nombres de usuarios y fechas; impresión/PDF. Reporte mensual exclusivo del administrador, con CSV e impresión/PDF, según el mes de creación de la solicitud.
- El único promedio mensual mostrado es **Promedio por órdenes ($/pza)**: suma de los costos unitarios de cada orden terminada ÷ número de órdenes de ese producto en el mes. Ejemplo: (6.3661 + 7.4442) ÷ 2 = 6.90515. Se conserva la precisión antes de mostrar hasta cuatro decimales.
- Se retiró el promedio mensual ponderado por el total de piezas de pantalla, CSV y PDF. La valoración interna del inventario se conserva para comprobar movimientos y no interviene en ese promedio mensual.
- Respaldo SQLite automático antes de la primera migración, migración idempotente y control de revisión para impedir guardados desactualizados.

## Historial v6.19: Ventas y costo promedio mensual por block (cálculo sustituido en v6.21)

- El módulo Cotizaciones ahora se llama **Ventas** en navegación, encabezados y permisos. Mantiene la elaboración de cotizaciones, confirmación/cancelación y seguimiento de pagos.
- **Reportes → Producción terminada y costo promedio mensual** tiene un selector de mes independiente del periodo general. Agrupa por producto y por mes de **finalización**, no por fecha programada.
- Costo promedio por pieza = suma de costos finales de las órdenes terminadas del producto en el mes / suma de piezas finales de esas órdenes. Usa materiales, indirectos y bono guardados al cierre. Pondera por cantidad producida; no promedia los costos unitarios de las órdenes con el mismo peso.
- Cada producto muestra órdenes, piezas, costo final total, promedio por pieza y base del cálculo. Un producto sin producción muestra “Sin producción” y no toma el promedio de otro mes ni el costo estándar. PDF y CSV utilizan el mismo mes y cálculo, con detalle por orden.
- Los cierres históricos estimados y los repartos provisionales se identifican. Una orden con datos de cierre incompletos se excluye tanto de costos como de piezas y se señala. Al completarse otras órdenes de la misma jornada puede ajustarse el reparto de indirectos, como antes.
- El reporte reemplaza el anterior promedio móvil por existencia. La valoración interna de movimientos se conserva para mantener la integridad del inventario, pero no interviene en el promedio mensual mostrado. No cambia cantidades, precios de venta ni tablas.
- Para actualizar, respalda y conserva `data/gromex.db`, sustituye el código incluyendo `js`, `index.html`, estilos y `assets`, ejecuta `npm start` y recarga la página.

## Historial v6.18: Resumen y navegación

- Resumen utiliza la fotografía de GROMEX como fondo, con una sombra suave para conservar la legibilidad del texto. Mantiene el contenido, alto mínimo, márgenes y relleno del encabezado. La imagen se adapta al espacio sin deformarse.
- El botón de módulos permite ocultar y mostrar la barra lateral también en computadora. Al ocultarla, el contenido aprovecha el espacio disponible; al mostrarla, recupera sus dimensiones originales.
- Transición de 240 ms y respeto por la preferencia de movimiento reducido. En móvil se puede cerrar al elegir un módulo, pulsar fuera, usar el botón de cierre o Escape. La navegación con teclado queda dentro del menú mientras está abierto.
- No cambia tablas ni datos. Para actualizar, conserva `data/gromex.db` y reemplaza el código **incluyendo `styles.css`, `index.html`, `js` y `assets`**. Ejecuta `npm start` y recarga la página (Ctrl+F5 si mantiene los estilos anteriores).

## Historial v6.17: contado en una sola exhibición

- Contado solo acepta un pago por el total con IVA. El formulario muestra el importe completo de solo lectura y el botón **Registrar pago total**. La API también rechaza importes parciales y varios registros que intenten dividir el pago, incluidos envíos del administrador.
- A crédito conserva el registro de abonos, el saldo y los estados de pago automáticos.
- No se permite cambiar una venta parcialmente pagada a contado ni cambiar a contado una venta liquidada mediante varios abonos. Tampoco aumentar el total de una venta de contado pagada dejándola parcialmente cubierta: el administrador debe revisar primero la condición de pago.
- Los pagos parciales de contado de versiones anteriores se conservan, sin inventar cobros ni convertir condiciones automáticamente. La pantalla muestra un aviso y bloquea nuevos cobros; el administrador puede regularizar la venta como A crédito con su fecha límite, si corresponde. Las anulaciones administrativas para corregir registros siguen conservando el historial.
- No requiere nuevas tablas ni altera datos existentes. Para actualizar, detén el servidor, respalda y conserva tu `data/gromex.db`, sustituye el código, ejecuta `npm start` y recarga las páginas abiertas.

## Historial v6.16: ventas y pagos separados (contado restringido en v6.17)

- **Estado de venta:** Pendiente, Confirmada o Cancelada. Confirmar una venta no registra un cobro. Una confirmada solo puede cancelarse y una cancelada no se reabre. Solo el administrador modifica productos, cantidades, importes o condiciones de ventas confirmadas.
- **Condición de pago:** Contado o A crédito. El crédito necesita una fecha límite de pago, independiente de la vigencia de la cotización. Puede elegirse al crear/editar o desde **Pagos → Condiciones de pago**.
- **Estado de pago automático:** No pagada, Pago parcial, Pagada o Vencida. Se obtiene del total con IVA, los abonos vigentes y la fecha límite. Si existe saldo después de la fecha límite, aparece Vencida, incluso si hubo pagos parciales; el importe pagado sigue visible. El vencimiento se calcula al consultar o actualizar la página con fecha de Ciudad de México.
- **Cotizaciones → Pagos:** historial de abonos, importe, fecha, referencia, usuario, pagado y saldo. Registrar abonos requiere venta confirmada y permiso **Registrar abonos de ventas**, activo por defecto para Ventas y Administrador. Cobrar no permite modificar el contenido comercial de la cotización. No se aceptan sobrepagos, importes negativos, fechas futuras ni más de dos decimales.
- Los abonos se conservan: no se editan ni borran. El administrador puede **Anular registro**, indicando el motivo, para corregir un registro equivocado; queda el historial. Esta corrección no representa una devolución de dinero. Cancelar una venta tampoco borra sus cobros ni registra una devolución; se excluye su saldo de las cuentas por cobrar.
- Duplicar una cotización crea una nueva Pendiente, de contado, sin abonos ni fecha límite de pago heredados.
- Listado y seguimiento muestran venta y pago por separado, con filtros por estado de venta, pago y condición. La cotización imprimible incluye condición, vencimiento, pagado y saldo. **Imprimir estado de cuenta** añade el historial de abonos. Se conserva la marca CANCELADA en ambos documentos cuando corresponde.
- El reporte mensual distingue **ventas confirmadas**, **cobros del mes por fecha del abono**, **saldo actual por cobrar** y **saldo actual vencido**. Las cuentas por cobrar son actuales y no se limitan al mes seleccionado. Los abonos no se suman otra vez a ventas ni utilidad. El indicador de utilidad sigue utilizando ventas confirmadas con IVA. CSV y PDF incluyen el desglose.
- Migración: Venta pagada, A crédito y Venta vencida pasan a Confirmada; No pagada pasa a Pendiente salvo que su historial contenga una confirmación/aprobación. Cancelada se conserva. Las pagadas anteriores conservan un saldo inicial pagado por su total, identificado como histórico y sin atribuirle fecha de cobro ni mes. Las condiciones a crédito y vencimientos anteriores sin fecha de pago quedan señalados para revisión administrativa; no se usa la vigencia como supuesto plazo de pago.
- La tabla **abonos_cotizacion** guarda importes en centavos enteros. Los campos de condición y vencimiento se guardan en cotizaciones. La API valida permisos, saldo e historial; una escritura desde una pestaña desactualizada no puede borrar un abono recién registrado.

Para actualizar, detén el servidor y respalda `data/gromex.db`. Sustituye el código conservando tu base local si tiene datos más recientes; ejecuta `npm start` y recarga las páginas abiertas. La migración se aplica una sola vez y conserva los registros operativos.

## Historial: cambios v6.15 (estados comerciales reemplazados en v6.16)

- **Reportes → Producción terminada y costo de existencias**: piezas reales, costo directo, indirectos asignados, bono, costo total y costo unitario por orden finalizada dentro del periodo. Incluye CSV e impresión/PDF.
- **Costo promedio por existencia**: promedio ponderado móvil por producto. Una entrada de producción suma piezas y costo de cierre. Una salida descuenta el costo promedio vigente. Se muestra existencia, costo promedio unitario y valor total actuales, independientemente del filtro de fechas del reporte.
- Los precios de insumos se guardan al cerrar cada orden. Los indirectos conservan la base de la primera orden cerrada de la misma fecha programada y se distribuyen entre las piezas reales terminadas de ese día. Si se termina otra orden de la misma fecha, se actualiza el reparto y la valoración; no se cobra dos veces la jornada. Las órdenes con otras pendientes de ese día se identifican como provisionales.
- Los saldos anteriores sin costo histórico se estiman al costo estándar al activar esta versión. Las entradas manuales se valoran al promedio disponible o, sin existencia, al costo estándar actual; se identifican como estimadas. Los movimientos que forman el saldo inicial y las entradas por producción terminada quedan protegidos; las correcciones del saldo inicial requieren nuevos movimientos.
- **Administración → Permisos por rol**: interruptores de módulos, entradas, salidas y reportes financieros. Conservan por defecto los permisos anteriores. Los cambios afectan las validaciones del servidor en cada operación; los usuarios deben recargar para actualizar sus botones. Precios, catálogo/fórmulas, usuarios y edición de ventas confirmadas permanecen exclusivos del administrador; el administrador conserva acceso para evitar bloquear la administración.
- Estados de cotización: **Venta pagada, No pagada, A crédito, Venta vencida y Cancelada**. Una pagada solo puede cancelarse; una venta a crédito puede pagarse, vencerse o cancelarse; una vencida puede pagarse o cancelarse; una cancelada no se reabre. El vencimiento se registra desde Cambiar estado.
- Migración: Borrador/Enviada/Pendiente → No pagada; Aprobada → No pagada conservando su aprobación histórica y bloqueo de edición; Rechazada → Cancelada. No se presupone que una aprobación anterior representa un pago.
- Ventas confirmadas para los indicadores: pagadas, a crédito o con confirmación histórica, excepto canceladas. Una venta a crédito que vence conserva el ingreso comercial registrado; esto no indica que se haya cobrado. El reporte financiero mensual sigue utilizando ventas con IVA y costos vigentes para su indicador de utilidad.
- Cotizaciones canceladas: marca de agua diagonal **CANCELADA**, fija en cada página impresa, en el documento independiente sin navegación.
- Persistencia: tabla `configuracion_sistema` para permisos y valoración; columna `ordenes_produccion.costos_cierre` para el detalle de costos guardados. Las cantidades operativas no se modifican por la migración.

### Actualizar

Detén el servidor y respalda `data/gromex.db`. Sustituye el código por este paquete conservando tu base local si tiene registros más recientes. Ejecuta `npm start`; la estructura y los estados se actualizan automáticamente. Recarga la página en las otras computadoras. No importes de nuevo un respaldo de estado de una versión anterior después de comenzar a operar con esta versión.

Validación: `npm test` comprueba costos promedio con salidas, indirectos compartidos, cierre y persistencia de producción, cambios de permisos por API, precios mínimos, estados y HTML de impresión. No se dispone de navegador instalado en el entorno de preparación; la paginación final depende del navegador y su diálogo de impresión.

## Historial: cambios v6.14 (las reglas actualizadas se describen arriba)

- Tres precios con IVA por producto: público general, casas materialistas y obras completas. Solo el administrador edita el catálogo. Los dos precios nuevos se inicializan con el precio existente, sin aplicar descuentos inventados.
- Nueva tarifa por partida de cotización, persistida en SQLite. Las cotizaciones previas conservan sus importes y se identifican con tarifa público general.
- Rol Ventas: cotizaciones y clientes; catálogo e inventario en consulta. Sin cambios de existencias, precios de catálogo, usuarios, proveedores ni producción. El servidor impide precios netos de descuento inferiores a la tarifa elegida, también al aprobar o reenviar documentos antiguos. Las aprobadas solo pueden editarse por el administrador y únicamente pueden cambiar a Cancelada.
- Reporte de producción: desglose de indirectos planeados y utilizados, total y por pieza. Planeado: gasto diario distribuido por piezas requeridas de las órdenes de la misma fecha programada. Utilizado: gasto diario distribuido por piezas finales de las órdenes terminadas de esa fecha. Mientras haya órdenes pendientes, se muestra como provisional. No es captura de facturas/gastos reales: usa los costos indirectos vigentes. No duplica una jornada entre órdenes.
- Reporte financiero mensual y utilidad trasladados de Inventario a Reportes (administrador), con CSV y PDF. Utilidad = ventas aprobadas **con IVA** − materiales − indirectos mensuales. Es un indicador interno, no utilidad contable neta; utiliza costos vigentes y cotizaciones aprobadas, no cobros ni facturas. No incluye canceladas.
- Ejecuta `npm test` para comprobar tarifas, permisos, migración y cálculos. Respalda la base antes de actualizar; conserva tu `data/gromex.db` si contiene datos más recientes. La migración se aplica al arrancar.

Esta versión integra cotizaciones y seguimiento en un solo módulo, y conserva clientes, proveedores, productos y fórmulas, inventario, producción, reportes, administración y **Costos de producción**. Ya no contiene registros de demostración ni utiliza `localStorage`: toda la información capturada se guarda en una base de datos SQLite.

## Inicio de sesión

- Al abrir el sistema se solicita nombre de usuario y contraseña antes de cargar cualquier información. El correo se conserva como dato obligatorio al registrar usuarios, pero ya no se utiliza para iniciar sesión.
- La API y la base de datos quedan protegidas por una sesión individual para cada navegador.
- Sin marcar **Mantener sesión iniciada en esta computadora**, la cookie de sesión se elimina al cerrar el navegador.
- Al marcarla, el acceso permanece guardado durante 90 días en esa computadora.
- El botón del usuario permite cerrar la sesión manualmente.
- Las contraseñas se almacenan con `scrypt` y una sal aleatoria; nunca se guardan ni se devuelven como texto visible.
- Los identificadores de sesión se generan aleatoriamente y solo su resumen criptográfico se guarda en SQLite.
- Si la base todavía no tiene usuarios con contraseña, la primera pantalla permite seleccionar al administrador existente y asignarle sus credenciales.
- Los usuarios existentes reciben automáticamente un nombre de usuario basado en la parte anterior a `@` de su correo; el administrador puede cambiarlo desde Administración.

## Costos directos e indirectos

- Los costos directos se obtienen automáticamente de los materiales y cantidades definidas en cada fórmula.
- Las fórmulas se capturan por olla o lote: se indica el rendimiento en piezas y el consumo completo de cada material; el sistema deriva la cantidad por pieza.
- Los materiales distinguen la unidad de compra/inventario de la unidad utilizada en las fórmulas. El costo base se calcula como `precio de compra / unidades de consumo contenidas en la compra`.
- Existencias, mínimos, máximos, entradas, salidas, reportes y CSV se muestran y capturan en la unidad de compra. Por ejemplo, el cemento comprado por tonelada aparece en toneladas en Inventario.
- Para no alterar el costeo ni el consumo de producción, el sistema normaliza internamente las cantidades con el factor configurado: `1 t = 1,000 kg`.
- Los costos indirectos se guardan exclusivamente en `costos_indirectos` y permiten capturar concepto, importe, periodicidad mensual/semanal/diaria y estado.
- Luz y agua de producción son conceptos editables en ese módulo. Ya no existen importes alternos dentro de la configuración de la empresa ni valores fijos de respaldo en el cálculo.
- El catálogo inicial corresponde a los conceptos entregados por la empresa: luz, nómina, renta, mantenimiento, gasolina de montacargas, flete de arena, agua de garrafón, agua de producción, diésel de bloquera y gastos varios.
- Para comparar y repartir importes de distinta periodicidad, un costo semanal se multiplica por 4 y uno diario por 24 para obtener su equivalente mensual.
- El sistema considera **4 semanas por mes**, **6 días laborables por semana** y, por lo tanto, **24 días laborables mensuales**.
- La meta o producción promedio inicial es de **4,032 blocks diarios** y también puede modificarse desde el módulo.
- La fórmula es `gasto diario = gasto mensual / 4 / 6` y `costo por block = gasto diario / cantidad producida en el día`.
- Para cualquier importe mensual capturado, el sistema aplica `gasto diario = importe / 4 / 6` y luego `costo por block = gasto diario / producción diaria`.
- El módulo permite configurar un **bono por cada block excedente**. El cálculo es `máximo(producción diaria - meta diaria, 0) × bono por block`.
- El bono se suma al costo diario total y se distribuye entre las unidades producidas para obtener el costo unitario completo.
- Productos y fórmulas muestra costo directo, indirecto estándar, total estándar y margen contra el precio de venta.
- Cada orden de producción guarda cantidad requerida, fecha, producto y almacén de destino.
- **Materiales utilizados** permite modificar los insumos y cantidades antes de finalizar. La emisión descuenta existencias y una corrección posterior ajusta únicamente la diferencia.
- **Finalizar proceso** registra las piezas realmente obtenidas y calcula `cantidad utilizada / piezas finales` para conservar el consumo real de cada material por block.
- El producto terminado entra al inventario con la cantidad final, no con la cantidad originalmente solicitada.
- Cada orden genera un reporte imprimible con cantidades requerida/final, almacén, materiales planeados/utilizados, consumo por block y costo directo.
- Producción recalcula directos, indirectos, excedente, bono y costo por block según la cantidad indicada en cada orden.
- Cotizaciones utiliza el costo estándar calculado con la meta diaria. Cotizar pocas piezas ya no carga sobre ellas todos los indirectos de una jornada.
- Después de aprobar una cotización, su estado solamente puede conservarse como aprobado o cambiarse a cancelado. La edición de sus datos queda restringida a administradores y la regla también se valida en el servidor.
- El rol Producción solo puede consultar Productos y fórmulas y registrar entradas de Inventario. El rol Almacén tiene las mismas vistas, pero únicamente puede registrar salidas. Ambos carecen de acceso a Proveedores, Producción, Costos de producción y Cotizaciones.
- Reportes incluye para Administrador el reporte financiero mensual con ventas aprobadas con IVA, costos directos por producto, desglose de indirectos, utilidad, margen, detalle por cotización y exportación a CSV o PDF.
- Producción conserva el costo real de cada orden y distribuye los indirectos del día entre la cantidad realmente fabricada.
- El catálogo de materiales se administra únicamente desde Inventario.
- Al crear o editar un material, su unidad debe elegirse del catálogo activo de `unidades_medida`; SQLite también valida esta regla mediante disparadores.
- El módulo incluye una tabla con el costo estimado de cada orden de producción.
- Los campos de cantidad, precio y descuento de la cotización conservan el foco al escribir; ya no es necesario capturar los números dígito por dígito.
- Al crear o editar una cotización puede elegirse **Escribir cliente sin registrarlo** y capturar nombre, empresa, teléfono, correo y dirección solo para ese documento.
- Esos datos quedan almacenados directamente en la cotización; no se crea un registro en el módulo Clientes.
- Clientes y proveedores incluyen botones para eliminar. Al borrar un cliente, sus cotizaciones conservan una copia de sus datos; al borrar un proveedor, sus materiales quedan sin proveedor asignado.
- Productos, fórmulas y materiales incluyen acciones de eliminación. Un producto con cotizaciones, órdenes o movimientos no se elimina para proteger el historial; puede marcarse como inactivo.
- Los movimientos manuales de inventario pueden eliminarse desde el buscador. Al hacerlo, la existencia se revierte automáticamente y se impide que una eliminación produzca inventario negativo. Los movimientos generados por órdenes de producción se protegen para conservar su historial.
- El inventario permite buscar materiales y productos por código/SKU o nombre.
- El módulo separa visualmente el inventario de materiales del inventario de productos y blocks; este último muestra existencia, precio, valor y accesos para registrar entradas o salidas.
- La búsqueda admite un rango inclusivo de fechas y muestra código, nombre, costo/precio, fecha, concepto o motivo, referencia, entradas, salidas y existencia actual.
- La descarga CSV incluye también el concepto y la referencia de cada movimiento.
- Las entradas y salidas pueden registrarse tanto para materiales como para productos.
- Al terminar una orden de producción, el producto fabricado entra automáticamente al inventario.
- Los precios de cotización se consideran importes finales con IVA incluido.
- El IVA es fijo del 16%: `subtotal = importe / 1.16`, `IVA = importe - subtotal` y `total = subtotal + IVA`.

## Catálogo técnico de blocks

- Incluye seis productos suministrados por CC GROMEX: blocks de 15×20×40 sin/con tapa, 12×20×40 con tapa, 10×20×40 con tapa, 12×20×40 relleno y tabicón pesado 10×14×28.
- Cada producto es una entidad de `productos` y tiene una relación uno-a-uno con `fichas_tecnicas_producto` y `perfiles_producto`.
- `recursos_costeo_producto` conserva precio unitario, costo por bulto, cantidad por bulto y consumo diario de cada recurso.
- Los recursos físicos se relacionan con `materiales`; luz, mano de obra y valores extras se relacionan con `costos_indirectos`.
- `formulas_producto` guarda el consumo unitario derivado del consumo por olla y su rendimiento.
- El cemento CPC 40 queda configurado con compra de 1 tonelada a $4,091.04, factor de 1,000 kg, costo de $4.09104/kg y consumo estándar de 25 kg por olla de 48 piezas ($2.13075 por pieza).
- La página muestra dimensiones, producción por olla o lote, capacidad diaria/semanal/mensual, costo de referencia y precio materialista.
- El costo de referencia de las hojas se conserva separado del costo actual calculado con inventario e indirectos, para que ambos puedan compararse sin sobrescribir el historial técnico.
- En Nuevo producto y Editar producto, los materiales se localizan mediante un buscador por código o nombre y se agregan individualmente antes de capturar la cantidad por olla o lote.
- La arena para fórmulas se captura en latas y muestra su conversión automática con la equivalencia `1 lata = 0.019 m³` almacenada en la base.
- La unidad del producto se selecciona desde `unidades_medida`; el servidor rechaza unidades inexistentes o inactivas.
- La existencia del producto es de solo lectura en su formulario y únicamente cambia mediante movimientos de Inventario o producción terminada.

## Requisitos

- Node.js 22.5 o posterior.
- Los archivos originales `styles.css` y la carpeta `assets` junto a `index.html`.

El proyecto no necesita instalar paquetes externos porque utiliza el módulo SQLite incluido en Node.js.

## Ejecución

Desde la carpeta del proyecto:

```bash
npm start
```

Después abre:

```text
http://localhost:3000
```

La base se crea automáticamente en `data/gromex.db`. Para desarrollo con reinicio automático puede usarse:

```bash
npm run dev
```

## Herramienta de revisión de la base

Antes de ejecutar cualquiera de estos comandos sobre una base real, crea una copia de `data/gromex.db`.

```bash
npm run db:inspeccionar
```

Comprueba integridad, llaves foráneas, cantidad de tablas, índices, vistas y cantidades de registros.

La base contiene 26 tablas que respaldan funciones actuales, incluidos los abonos y la configuración de permisos y valoración. Las tablas de movimientos, órdenes y materiales utilizados pueden aparecer vacías antes de comenzar la operación, pero son necesarias para Inventario y Producción. Al abrir una base creada con la edición anterior, el servidor completa la estructura requerida y conserva los datos operativos.

Para trabajar con una copia distinta puede indicarse la ruta:

```powershell
$env:GROMEX_DB_PATH="C:\ruta\copia-gromex.db"
npm run db:inspeccionar
```

El catálogo técnico de los seis blocks puede cargarse de forma idempotente en otra base de desarrollo con:

```bash
npm run catalogo:blocks
```

El comando actualiza esos seis productos y sus relaciones sin duplicarlos.

## Primera configuración

La base comienza completamente vacía. El orden recomendado de captura es:

1. En la primera pantalla, registra nombre completo, nombre de usuario, correo y contraseña del administrador. Si actualizaste una base anterior, selecciona el administrador existente.
2. En **Administración**, captura los datos de la empresa y crea los demás usuarios con nombre de usuario, correo y contraseña propios.
3. Registra clientes y proveedores si deseas reutilizarlos. También puedes escribir un cliente directamente al crear la cotización.
4. Registra materiales y sus existencias.
5. Registra productos y configura sus fórmulas.
6. Crea cotizaciones, movimientos y órdenes de producción.

El primer usuario configurado recibe el rol **Administrador** e inicia sesión automáticamente.

## Estructura

```text
index.html
app.js
auth.css
server.js
package.json
server/
├── database.js
├── schema-maintenance.js
└── schema.sql
scripts/
├── db-common.js
└── inspeccionar-base.js
js/
└── core/
    ├── dom.js
    ├── auth.js
    ├── formatters.js
    ├── inventory.js
    ├── production-cost.js
    ├── quotation.js
    ├── storage.js
    └── ui.js
data/
└── gromex.db          # se genera al iniciar
```

## Persistencia

El frontend comprueba primero la sesión mediante `GET /api/auth/status`. Solo después de autenticar al usuario consulta `GET /api/state` y envía cambios mediante `PUT /api/state`. El servidor guarda la información en tablas relacionadas para empresa, usuarios, sesiones, clientes, proveedores, materiales, productos, fórmulas, cotizaciones, partidas, historial, movimientos, almacenes, órdenes, insumos utilizados y actividad.

Las operaciones de escritura se ejecutan dentro de una transacción SQLite. Si alguna relación no es válida, la transacción completa se revierte para evitar datos incompletos.

La integridad se refuerza con llaves foráneas, claves únicas para correos y códigos, índices de consulta y restricciones que impiden cantidades negativas, descuentos fuera de rango y órdenes con avances inválidos. `materiales.proveedor_id` mantiene la relación formal con `proveedores`; `proveedor_nombre` se conserva para mostrar el dato histórico en la interfaz.

Consulta [BASE-DE-DATOS.md](BASE-DE-DATOS.md) para conocer el propósito y las relaciones de cada tabla.
