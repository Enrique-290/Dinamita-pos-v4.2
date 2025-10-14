# Dinamita POS v4.2 (Reintegración)

**Fecha:** 2025-10-14 16:28

## Cambios principales aplicados
- Ventas: membresías desde Ventas (tipo, fechas, notas), miniaturas de producto, cliente por defecto "Público General", ticket 58mm más legible.
- Membresías: gestión de tipos en UI; sincroniza con Ventas; cobrar aquí.
- Historial: cancelar venta con reversa de stock; reimpresión por folio; exportación incluye estado.
- Compras: nuevo módulo de reabasto con promedio ponderado opcional; historial y exportación CSV.
- Inventario: campo "Código alterno"; imágenes; export CSV.
- Configuración: tema, datos del ticket, IVA 0 por defecto, logo.
- Dashboard: KPIs y gráficas ignoran ventas canceladas.
- Navegación: enrutamiento por hash (#ventas, #compras, etc.); cache-busting en assets.
- Estilos: namespaces por página; ticket más grande/negritas.

## Checklist de pruebas sugeridas
1. Registrar venta de producto y membresía; imprimir ticket y reimprimir desde Historial.
2. Cancelar la venta y confirmar que el stock se repone; KPIs ya no cuentan esa venta.
3. Agregar compra con promedio ponderado y verificar actualización de costo/stock.
4. Exportar CSV: Ventas, Membresías, Inventario, Compras.
5. Editar tema y datos del ticket; cargar logo ligero y reimprimir.
6. Probar en móvil: abrir/cerrar menú y navegar por hash.
