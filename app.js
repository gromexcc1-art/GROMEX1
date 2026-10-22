import { initNumericInputs } from './js/core/numeric-inputs.js';
import { createViewPersonalization } from './js/core/view-personalization.js';
import { createOperationsUI } from './js/core/operations-ui.js';
import { commercialAvailability } from './js/core/product-calculator.js';
import { expenseTotals } from './js/core/expenses.js';
import { mountNavigation, syncNavigation, hubs, parentView, routeInfo, hubMarkup } from './js/core/navigation.js';
import { fixedApplies } from './js/core/variable-costs.js';
import { downloadExcelReport } from './js/core/excel-reports.js';
import { professionalReport } from './js/core/report-document.js';
import { initTheme } from './js/core/theme.js';
import { stockAlerts, isLowStock } from './js/core/stock-alerts.js';
import { icon } from './js/core/icons.js';
import { createMonthEndUI } from './js/core/month-end.js';
import { mountMonthlyAudit } from './js/core/monthly-audit.js';
import { createQuotationUI, pendingQuotations } from './js/core/quotations.js';
import { createDeliveryUI } from './js/core/deliveries.js';
import { deliverySummary, emptyDelivery } from './js/core/delivery-summary.js';
import { createTransferUI } from './js/core/transfers.js';
import { PAYMENT_TERMS, PAYMENT_STATUSES, paymentSummary, clientCredit, collectionReport, businessToday, validDate, cents } from './js/core/payments.js';
import { QUOTE_STATUSES, quotationWasConfirmed, availableQuoteStatuses, isSale } from './js/core/quote-status.js';
import { ROLES, PERMISSIONS, hasPermission, normalizePermissions } from './js/core/permissions.js';
import { PRICE_TIERS, productTierPrice, assertQuotationPrices } from './js/core/pricing.js';
import { orderIndirectCosts } from './js/core/order-report.js';
import { $, $$ } from './js/core/dom.js';
import { initSidebar } from './js/core/sidebar.js';
import { monthlyProductionReport, productionCostBasis } from './js/core/monthly-production.js';
import {
    addDays,
    dateFmt,
    esc,
    money,
    moneyPrecise,
    num,
    today,
    uid
} from './js/core/formatters.js';
import { FIXED_TAX_RATE, nextFolio, quoteTotals } from './js/core/quotation.js';
import {
    fromInventoryQuantity,
    inventoryItems,
    inventoryUnit,
    inventoryUnitPrice,
    searchInventory,
    toInventoryQuantity
} from './js/core/inventory.js';
import {
    monthlyEquivalent,
    productProductionCosts,
    productStandardCosts, productDailyTarget, profitPercent,
    quotationProductionCosts,
    STANDARD_DAILY_PRODUCTION,
    WORKING_DAYS_PER_MONTH,
    WORKING_DAYS_PER_WEEK,
    WORKING_WEEKS_PER_MONTH
} from './js/core/production-cost.js';
import {
    addActivity,
    loadState,
    saveState
} from './js/core/storage.js';
import { ensureAuthenticated, logout } from './js/core/auth.js';
import {
    closeModal,
    empty,
    openModal,
    sectionHead,
    setPage,
    stat,
    tag,
    toast
} from './js/core/ui.js';
import { createModuleMotion } from './js/core/motion.js';

// app.js coordina las vistas; la infraestructura reutilizable vive en js/core.
initTheme();
await ensureAuthenticated();
const sidebarControls = initSidebar();
const animateModule = createModuleMotion();
initNumericInputs();
const S = await loadState().catch(error => {
    $('#pageTitle').textContent = 'Sin conexión con la base de datos';
    $('#pageEyebrow').textContent = 'SERVIDOR NO DISPONIBLE';
    $('#content').innerHTML = `<article class="panel"><h2>No se pudieron cargar los datos</h2><p class="hint">Inicia el proyecto con <b>npm start</b> y vuelve a abrir http://localhost:3000.</p><p class="danger-text">${esc(error.message)}</p></article>`;
    throw error
});
let inventoryWarehouseId = '';
let inventoryFocusKey='';
let inventoryOnlyLow=false;
const deliveryUI=createDeliveryUI({state:S,user:()=>user(),reload:async()=>Object.assign(S,await loadState()),render:()=>render()});
const transferUI = createTransferUI({state:S,user:()=>user(),reload:async()=>Object.assign(S,await loadState()),back:()=>go('transferHub'),downloadCSV});
const monthEndUI=createMonthEndUI({user:()=>user()});
const operationsUI=createOperationsUI({state:S,user:()=>user(),save,downloadCSV});
const quotationUI=createQuotationUI({state:S,client:q=>quoteClient(q),can:key=>can(key),create:()=>openQuoteForm(),view:viewQuote,edit:openQuoteForm,duplicate:duplicateQuote,print:printQuotation,convert:convertQuotation,status:statusQuote});
let productionReportMonth = today().slice(0, 7);
let currentView = window.location.hash.slice(1) || 'dashboard'
  , quoteMode = 'list'
  , reportFilters = {
    from: `${today().slice(0, 8)}01`,
    to: today()
};
const quoteFilters={search:'',status:'',payment:'',terms:'',delivery:''};
const initialAdministrator = {
    id: '',
    name: 'Administrador inicial',
    username: 'administrador',
    email: '',
    role: 'Administrador',
    active: true
};
const user = () => S.users.find(u => u.id === S.sessionId) || S.users[0] || initialAdministrator;
const client = id => S.clients.find(x => x.id === id) || {
    name: 'Cliente eliminado',
    company: '',
    phone: '',
    email: '',
    address: ''
};
const quoteClient = quotation => S.clients.find(x => x.id === quotation.clientId) || {
    name: quotation.clientName || 'Cliente sin nombre',
    company: quotation.clientCompany || '',
    phone: quotation.clientPhone || '',
    email: quotation.clientEmail || '',
    address: quotation.clientAddress || ''
};
const quotationWasApproved = quotationWasConfirmed;
const canEditQuotation = quotation => user().role === 'Administrador' || (!quotationWasApproved(quotation) && quotation.status !== 'Cancelada');
const can = key => hasPermission(S.rolePermissions, user().role, key);
const supplier = idOrName => S.suppliers.find(x => x.id === idOrName || x.name === idOrName) || {
    name: idOrName || 'Proveedor no asignado',
    category: '',
    status: 'Inactivo'
};
const material = id => S.materials.find(x => x.id === id) || {
    code: '',
    name: 'Material',
    unit: '',
    price: 0,
    stock: 0
};
const product = id => S.products.find(x => x.id === id) || {
    sku: '',
    name: 'Producto',
    unit: 'pza',
    price: 0,
    stock: 0,
    waterCost: 0,
    electricityCost: 0,
    productionQuantity: 0,
    recipe: {}
};
const productionSettings = (asOf=businessToday()) => ({
    asOf, orders:S.orders,
    indirectCosts: S.indirectCosts,
    standardDailyProduction: S.company.standardDailyProduction ?? STANDARD_DAILY_PRODUCTION,
    bonusPerExtraBlock: S.company.bonusPerExtraBlock ?? 0
});
const productionQuantityForDate = (date, orders = S.orders) => orders
    .filter(order => order.date === date && order.status !== 'Cancelada')
    .reduce((total, order) => total + (+order.qty || 0), 0);
function save() {
    return saveState(S).then(saved => {
        S.revision = saved.revision;
        S.warehouseStocks = saved.warehouseStocks;
        S.movements.forEach(m=>{m.warehouseId=saved.movements.find(x=>x.id===m.id)?.warehouseId || m.warehouseId;});
        S.valuation = saved.valuation;
        S.variableCosts = saved.variableCosts;
        S.operatingExpenses=saved.operatingExpenses;S.creditWithdrawals=saved.creditWithdrawals;
        S.productionCostHistory = saved.productionCostHistory;
        S.indirectCosts = saved.indirectCosts;
        S.rolePermissions = saved.rolePermissions;
        S.quotations.forEach(q => { const stored = saved.quotations.find(x=>x.id===q.id); if(stored) for(const key of ['history','status','delivery','payments','paymentTerms','paymentDue','legacyPaymentOverdue','paymentMigrationNote']) q[key]=stored[key]; });
        S.orders.forEach(order => { order.costSnapshot = saved.orders.find(o => o.id === order.id)?.costSnapshot || null; });
        return true;
    }).catch(error => {
        console.error(error);
        toast(error.message || 'No se pudo guardar en la base de datos');
        return false
    })
}
function log(text) {
    addActivity(S, text, user().name)
}
function roleAllowed(view) {
    const aliases={lowStock:'inventory',warehouses:'inventory',materials:'inventory',products:'inventory',movements:'inventory',directCosts:'costs',indirectCosts:'costs',productionReport:'reports.financial',expenseReport:'reports.financial',financialReport:'reports.financial',auditReport:'reports.audit',companySettings:'admin',userSettings:'admin',permissionSettings:'admin'};
    if(aliases[view])return can(aliases[view]);
    if(view==='transferReport')return can('inventory') && user().role==='Administrador';
    if(view==='transferHub')return roleAllowed('transfers');
    if(view==='monthEnd')return can('reports.monthEnd');
    if(view==='transfers') return can('inventory') && ['Almacén','Administrador'].includes(user().role);
    return can(view)
}
function go(view) {
    if (!roleAllowed(view)) {
        toast('Tu rol no tiene acceso a este módulo');
        return
    }
    currentView = view;
    if(window.location.hash!==`#${view}`)window.history.pushState(null,'',`#${view}`);
    closeModal();
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    sidebarControls.closeMobile();
    render();
    window.scrollTo(0, 0)
}
function render() {
    if (!roleAllowed(currentView)) {
        currentView = PERMISSIONS.map(([key]) => key).find(key => !key.includes('.') && roleAllowed(key));
        if (!currentView) {
            setPage('Sin módulos asignados', 'ACCESO');
            $('#content').innerHTML = '<article class="panel"><p>Tu rol no tiene módulos habilitados. Solicita al administrador que revise tus permisos.</p></article>';
            updateShell();
            return;
        }
    }
    const views = {
        dashboard: renderDashboard,
        quotations: ()=>quotationUI.render(),
        quotes: renderQuotes,
        clients: renderClients,
        suppliers: renderSuppliers,
        catalog: renderCatalog,
        inventory: ()=>renderHub('inventory'),
        lowStock:renderInventory,warehouses:renderWarehouses,materials:renderInventory,products:renderInventory,movements:renderInventory,
        calculator:()=>operationsUI.calculator(),expenses:()=>operationsUI.expenses(),expenseReport:()=>operationsUI.expenses(true),
        transferHub:()=>renderHub('transferHub'),transferReport:()=>transferUI.render(true),
        transfers: () => transferUI.render(),
        production: renderProduction,
        costs: ()=>renderHub('costs'),directCosts:renderProductionCosts,indirectCosts:renderProductionCosts,
        reports: ()=>renderHub('reports'),productionReport:renderReports,auditReport:renderReports,financialReport:renderReports,
        monthEnd:()=>monthEndUI.render(),
        admin: ()=>renderHub('admin'),companySettings:renderAdmin,userSettings:renderAdmin,permissionSettings:renderAdmin
    };
    (views[currentView] || renderDashboard)();
    updateShell();
    animateModule($('#content'), currentView)
}
function updateShell() {
    const u = user();
    if(window.location.hash!==`#${currentView}`)window.history.replaceState(null,'',`#${currentView}`);
    document.title=`${$('#pageTitle').textContent} · CC GROMEX`;
    $('#openModuleTab').href=`#${currentView}`;
    $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===currentView));
    $('#userName').textContent = u.name;
    $('#userRole').textContent = u.role;
    $('#userInitials').textContent = u.name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
    $('#quoteBadge').textContent = S.quotations.filter(q => q.status === 'Pendiente').length;
    $$('.nav-item').forEach(x => x.classList.toggle('hidden', !roleAllowed(x.dataset.view)));
    $('#newQuoteTop').classList.toggle('hidden', !roleAllowed('quotations'));
    syncNavigation(currentView,roleAllowed);
    personalization.apply();
    const parent=parentView(currentView),back=$('#moduleBack');back.hidden=parent===currentView;back.href='#'+parent;back.innerHTML=icon('arrow-left')+' Volver a '+(routeInfo(parent)?.[1] || 'módulos');
    $('#globalSearch').placeholder = (roleAllowed('quotes') || roleAllowed('quotations'))
      ? 'Buscar cotización, cliente o material…'
      : 'Buscar material en inventario…'
}

function monthlyQuotationTotals(quotations) {
    const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });
    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = quotations
            .filter(quotation => !quotation.folio?.startsWith('VEN-') && quotation.issue?.startsWith(key))
            .reduce((sum, quotation) => sum + quoteTotals(quotation).total, 0);
        const label = monthFormatter.format(date).replace('.', '');
        return [label.charAt(0).toUpperCase() + label.slice(1), amount]
    })
}

function renderDashboard() {
    setPage('Resumen', 'OPERACIÓN GENERAL');
    const approved = S.quotations.filter(q => isSale(q))
      , sales = approved.reduce( (s, q) => s + quoteTotals(q).total, 0)
      , low = stockAlerts(S,user())
      , value = S.materials.reduce( (s, m) => s + m.stock * m.price, 0)
      , cons = {};
    S.movements.filter(m => m.type === 'OUT' && m.materialId).forEach(movement => {
        const item = material(movement.materialId);
        cons[movement.materialId] = (cons[movement.materialId] || 0) + toInventoryQuantity(item, movement.qty)
    });
    const months = monthlyQuotationTotals(S.quotations)
      , max = Math.max(1, ...months.map(x => x[1]));
    $('#content').innerHTML = `<div class="hero"><div><span class="pill"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" />  <path d="m9 12 2 2 4-4" /></svg> Operación sincronizada</span><h2>Tu producción, bajo control.</h2><p>Ventas, clientes, materiales y fabricación en un solo lugar.</p></div></div><div class="metrics">${stat('banknote', 'VENTAS CONFIRMADAS', money(sales), 'Ventas confirmadas', 'blue')}${stat('file-text', 'COTIZACIONES ABIERTAS', S.quotations.filter(q => q.status === 'Pendiente').length, 'Requieren seguimiento', 'orange')}${stat('warehouse', 'VALOR DE INVENTARIO', money(value), 'Existencias × costo', 'teal')}${stat('triangle-alert', 'ALERTAS DE STOCK', low.length, 'Materiales y productos por almacén', 'red')}</div><div class="grid two"><article class="panel"><div class="panel-head"><div><h3>Monto cotizado por mes</h3><p>Evolución comercial de los últimos seis meses</p></div></div><div class="chart-wrap"><div class="chart">${months.map( (m, i) => `<div class="chart-col"><i class="chart-bar ${i === months.length - 1 ? 'accent' : ''}" style="height:${m[1] ? Math.max(5, m[1] / max * 100) : 0}%"></i><small>${m[0]}</small></div>`).join('')}</div></div></article><article class="panel"><div class="panel-head"><div><h3>Consumo de materiales</h3><p>Salidas acumuladas registradas</p></div><button class="btn btn-outline btn-sm" data-go="inventory">Ver inventario</button></div>${Object.entries(cons).slice(0, 5).map( ([id,v]) => {
        const m = material(id);
        const pct = Math.min(100, v / Math.max(...Object.values(cons)) * 100);
        return `<div class="progress-row"><div class="progress-label"><span>${esc(m.name)}</span><b>${num(v)} ${esc(inventoryUnit(m))}</b></div><div class="progress"><i class="orange" style="width:${pct}%"></i></div></div>`
    }
    ).join('') || '<p class="hint">Sin consumos registrados.</p>'}</article><article class="panel"><div class="panel-head"><div><h3>Cotizaciones recientes</h3><p>Últimos movimientos comerciales</p></div><button class="btn btn-outline btn-sm" data-go="quotations">Ver todas</button></div>${quotationUI.table(pendingQuotations(S.quotations).slice().sort( (a, b) => b.issue.localeCompare(a.issue)).slice(0, 4), false)}</article><article class="panel"><div class="panel-head"><div><h3>Alertas de stock bajo</h3><p>Materiales compartidos y productos por almacén. Selecciona una alerta para abrir su inventario.</p></div>${can('inventory')?'<button class="secondary" id="openLowInventory">Ver stock bajo</button>':''}</div><div class="stock-alert-list">${low.map((a,i)=>{const m=a.item;return `<${can('inventory')?'button type="button"':'div'} class="stock-alert ${can('inventory')?'':'stock-alert-static'}" data-stock-alert="${i}">${icon('triangle-alert')}<span><strong>${esc(m.name)}</strong><small>${esc(a.warehouse)} · Mín. ${num(toInventoryQuantity(m,m.min || 0))} ${esc(inventoryUnit(m))}</small></span><b>${m.stock<=0?'Sin existencias':num(toInventoryQuantity(m,m.stock))+' '+esc(inventoryUnit(m))}</b>${can('inventory')?icon('arrow-right'):''}</${can('inventory')?'button':'div'}>`;}).join('') || '<p class="hint">Sin alertas de stock bajo en los almacenes disponibles.</p>'}</div></article></div>`;
    bindGo();
    if(can('inventory')){
      $$('[data-stock-alert]').forEach(b=>b.onclick=()=>{const a=low[Number(b.dataset.stockAlert)];inventoryWarehouseId=a.warehouseId || user().warehouseId || 'alm-principal';inventoryFocusKey=a.key;inventoryOnlyLow=false;go(a.key.startsWith('material:')?'materials':'products');});
      $('#openLowInventory').onclick=()=>{inventoryOnlyLow=true;inventoryFocusKey='';go('lowStock');};
      const metric=$('.metrics .stat:last-child');metric.tabIndex=0;metric.setAttribute('role','button');metric.setAttribute('aria-label','Abrir inventario con stock bajo');metric.style.cursor='pointer';metric.onclick=$('#openLowInventory').onclick;metric.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();metric.click();}};
    }
}

function paymentSummaryHtml(q) {
    const p=paymentSummary(q);
    return `<section style="margin-top:18px;border:1px solid #dce5e9;padding:12px;break-inside:avoid"><h3 style="font-size:14px;margin:0 0 8px">Venta y pago</h3><div style="display:flex;flex-wrap:wrap;gap:12px 24px"><span>Venta: <b>${esc(q.status)}</b></span><span>Pago: <b>${esc(p.status)}</b></span><span>Condición: <b>${esc(p.terms)}</b></span><span>Límite de pago: <b>${p.due ? dateFmt(p.due) : 'Sin fecha registrada'}</b></span><span>Pagado: <b>${money(p.paid)}</b></span><span>Saldo: <b>${money(p.balance)}</b></span></div>${q.status==='Cancelada'?'<p style="font-size:11px">Fuera de cuentas por cobrar. Los pagos registrados se conservan; cancelar la venta no registra una devolución.</p>':''}${q.paymentMigrationNote?`<p style="font-size:10px;color:#647984">Migración: ${esc(q.paymentMigrationNote)}</p>`:''}</section>`;
}
function paymentHistoryHtml(q, actions=false) {
    return `<div class="table-wrap"><table><thead><tr><th>Fecha del abono</th><th>Importe</th><th>Referencia</th><th>Registró</th><th>Estado</th>${actions?'<th></th>':''}</tr></thead><tbody>${(q.payments || []).map(p=>`<tr><td>${p.date?dateFmt(p.date):'Fecha no registrada'}${p.legacy?'<small style="display:block">Saldo inicial histórico</small>':''}</td><td>${money(p.amount)}${p.creditGenerated?`<small style="display:block">Saldo a favor generado: ${money(p.creditGenerated)}</small>`:p.creditUsed?'<small style="display:block">Pagado con saldo a favor</small>':''}</td><td>${esc(p.reference)}</td><td>${esc(p.user)}</td><td>${p.voidedAt?`Anulado: ${esc(p.voidReason)}<br><small>${esc(p.voidedBy)} · ${dateFmt(p.voidedAt.slice(0,10))}</small>`:'Vigente'}</td>${actions?`<td>${user().role==='Administrador'&&!p.voidedAt?`<button class="btn btn-danger btn-sm" data-void-payment="${esc(p.id)}">Anular registro</button>`:''}</td>`:''}</tr>`).join('') || `<tr><td colspan="${actions?6:5}">Sin abonos registrados.</td></tr>`}</tbody></table></div>`;
}
function paymentsModal(id) {
    if (!roleAllowed('quotes')) return toast('Tu rol no tiene acceso a ventas.');
    const q=S.quotations.find(x=>x.id===id);
    if (!q || !quotationWasConfirmed(q)) return toast('Convierte la cotización en venta antes de registrar pagos.');
    const p=paymentSummary(q), cash=p.terms==='Contado';
    const cashPartial=cash && p.paid>0 && p.balance>0;
    const canCollect=can('quotes.payments') && q.status==='Confirmada' && !cashPartial;
    const editTerms=q.status!=='Cancelada' && canEditQuotation(q);
    openModal(`Pagos · ${q.folio}`, cash ? 'Contado: pago total en una sola exhibición.' : 'A crédito: registra abonos hasta liquidar el saldo.',
      paymentSummaryHtml(q) + `<h3 style="margin-top:18px">Condiciones de pago</h3><div class="form-grid"><div class="field"><label>CONDICIÓN</label><select id="payTerms" ${editTerms?'':'disabled'}>${PAYMENT_TERMS.map(t=>`<option ${t===p.terms?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>FECHA LÍMITE DE PAGO</label><input type="date" id="payDue" value="${esc(p.due)}" ${editTerms?'':'disabled'}><small>La vigencia de la cotización permanece separada.</small></div></div>${editTerms?'<button class="secondary" id="savePaymentTerms" style="margin-top:12px">Guardar condiciones</button>':'<p class="hint">Las condiciones de una venta confirmada solo las modifica el administrador.</p>'}
      <p class="hint">Saldo a favor del cliente: <b>${money(clientCredit(S.quotations,q.clientId,'9999-12-31',S.creditWithdrawals))}</b>. ${q.clientId?'Puede usarse en otras ventas de este mismo cliente.':'Registra al cliente y selecciónalo en la venta para guardar o usar saldo a favor.'}</p>
      ${canCollect && p.balance>0 && clientCredit(S.quotations,q.clientId,'9999-12-31',S.creditWithdrawals)>0?'<div class="field"><label>USAR SALDO A FAVOR</label><input id="creditAmount" type="number" min="0.01" step="0.01" placeholder="Importe a usar"><small>Si también entregan dinero, captura ambos importes y pulsa Guardar abono o Registrar pago total.</small></div><button class="secondary" id="applyCredit">Aplicar a esta venta</button>':''}
      <h3 style="margin-top:20px">Historial de abonos</h3>${paymentHistoryHtml(q,true)}
      ${cashPartial?'<p class="hint danger-text">Existe un pago parcial de contado registrado anteriormente. Se conserva el historial, pero no se admiten nuevos cobros. El administrador debe revisar la condición de pago; si corresponde, cambiarla a crédito con su fecha límite.</p>':''}
      ${canCollect?`<h3 style="margin-top:20px">${cash ? 'Cobrar total de contado' : 'Registrar abono'}</h3><div class="form-grid"><div class="field"><label>IMPORTE</label><input id="payAmount" type="number" min="0.01" step="0.01" placeholder="0.00" value="0">${cash ? '<small>El pago debe cubrir la venta. Si entregan de más, se guardará como saldo a favor.</small>' : ''}</div><div class="field"><label>FECHA DEL PAGO</label><input id="payDate" type="date" min="${q.issue}" max="${businessToday()}" value="${businessToday()}"></div><div class="field full"><label>REFERENCIA O CONCEPTO</label><input id="payReference" placeholder="Transferencia, efectivo, folio de depósito…"></div></div>`:q.status==='Pendiente'?'<p class="hint">Confirma la venta antes de registrar un abono.</p>':''}`,
      `<button class="secondary" data-close>Cerrar</button><button class="secondary" id="printPayments">Imprimir estado de cuenta</button>${canCollect?`<button class="primary" id="registerPayment">${cash ? 'Registrar pago total' : 'Guardar abono'}</button>`:''}`,true);
    $('#printPayments').onclick=()=>printPaymentStatement(id);
    if(editTerms) $('#savePaymentTerms').onclick=async()=>{
        const before=structuredClone(q);
        q.paymentTerms=$('#payTerms').value;q.paymentDue=$('#payDue').value;
        if(q.paymentDue) q.legacyPaymentOverdue=false;
        $('#savePaymentTerms').disabled=true;
        if(!await save()){Object.assign(q,before);$('#savePaymentTerms').disabled=false;return;}
        toast('Condiciones guardadas');paymentsModal(id);render();
    };
    if(canCollect) $('#registerPayment').onclick=async()=>{
        const amount=Number($('#payAmount').value),date=$('#payDate').value;
        if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-cents(amount))>0.000001) return toast('Captura un importe positivo, con hasta dos decimales.');
        const useAmount=Number($('#creditAmount')?.value || 0);
        if(!Number.isFinite(useAmount) || useAmount<0 || Math.abs(useAmount*100-cents(useAmount))>0.000001 || cents(useAmount)>cents(p.balance) || cents(useAmount)>cents(clientCredit(S.quotations,q.clientId,'9999-12-31',S.creditWithdrawals)))return toast('Revisa el saldo a favor que deseas usar.');
        if(cash && cents(amount)+cents(useAmount)<cents(p.balance)) return toast('En contado, el dinero recibido y el saldo a favor deben cubrir toda la venta.');
        if(!validDate(date)||date>businessToday()||date<q.issue) return toast('Revisa la fecha del abono.');
        const appliedBalance=Math.max(0,cents(p.balance)-cents(useAmount))/100;
        const extra=Math.max(0,cents(amount)-cents(appliedBalance))/100;
        if(extra && !q.clientId)return toast('Selecciona un cliente registrado antes de guardar saldo a favor.');
        if(extra && !window.confirm(`Recibido: ${money(amount)}. Se usarán ${money(useAmount)} de saldo a favor y ${money(appliedBalance)} del dinero recibido para esta venta y ${money(extra)} quedarán como saldo a favor de ${quoteClient(q).name}. ¿El importe es correcto?`))return;
        const before=structuredClone(q);
        q.payments ||= [];
        if(useAmount)q.payments.push({id:uid(),amount:useAmount,date,reference:'Pago con saldo a favor',useCredit:true});
        q.payments.push({id:uid(),amount:cents(amount)/100,date,reference:$('#payReference').value.trim(),confirmExcess:extra>0});
        $('#registerPayment').disabled=true;
        if(!await save()){Object.assign(q,before);$('#registerPayment').disabled=false;return;}
        toast(cash ? 'Pago total registrado' : 'Abono registrado');paymentsModal(id);render();
    };
    if($('#applyCredit'))$('#applyCredit').onclick=async()=>{
        const amount=Number($('#creditAmount').value);
        if(!Number.isFinite(amount) || amount<=0 || Math.abs(amount*100-cents(amount))>0.000001 || cents(amount)>cents(p.balance) || cents(amount)>cents(clientCredit(S.quotations,q.clientId,'9999-12-31',S.creditWithdrawals)))return toast('El importe debe estar dentro del saldo disponible y de lo que falta por pagar.');
        if(cash && cents(amount)!==cents(p.balance))return toast('Para pagar solo con saldo a favor debe cubrir toda la venta. Para combinarlo con dinero, captura el importe recibido y pulsa Registrar pago total.');
        if(!window.confirm(`¿Aplicar ${money(amount)} del saldo a favor de ${quoteClient(q).name} a ${q.folio}?`))return;
        const before=structuredClone(q);q.payments ||= [];q.payments.push({id:uid(),amount,date:businessToday(),reference:'Pago con saldo a favor',useCredit:true});$('#applyCredit').disabled=true;
        if(!await save()){Object.assign(q,before);$('#applyCredit').disabled=false;return;}
        toast('Saldo a favor aplicado');paymentsModal(id);render();
    };
    $$('[data-void-payment]').forEach(button=>button.onclick=async()=>{
        const reason=window.prompt('Motivo de la anulación del registro. Esta corrección no representa una devolución de dinero:');
        if(!reason?.trim()) return;
        const before=structuredClone(q),payment=q.payments.find(p=>p.id===button.dataset.voidPayment);
        payment.voidedAt=new Date().toISOString();payment.voidReason=reason.trim();
        button.disabled=true;
        if(!await save()){Object.assign(q,before);button.disabled=false;return;}
        toast('Abono anulado; historial conservado');paymentsModal(id);render();
    });
}
function printPaymentStatement(id) {
    const q=S.quotations.find(x=>x.id===id);
    if(!q || !quotationWasConfirmed(q) || !roleAllowed('quotes')) return;
    const reportWindow=window.open('', '_blank', 'width=1050,height=760');
    if(!reportWindow) return toast('Permite las ventanas emergentes para imprimir.');
    reportWindow.opener=null;reportWindow.document.write(professionalReport(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de cuenta · ${esc(q.folio)}</title></head><body>${q.status==='Cancelada'?'<div class="watermark"><span>CANCELADA</span></div>':''}<h1>${esc(S.company.name)} · Estado de cuenta</h1><p>${esc(q.folio)} · ${esc(quoteClient(q).name)} · Generado: ${dateFmt(businessToday())}</p>${paymentSummaryHtml(q)}${paymentHistoryHtml(q)}</body></html>`,{company:S.company.name,landscape:false}));
    reportWindow.document.close();
}

function quoteTable(list, actions=true) {
    return `<div class="table-wrap"><table><thead><tr><th>FOLIO / FECHA</th><th>CLIENTE</th><th>TOTAL CON IVA</th><th>VENTA</th><th>ENTREGA</th><th>PAGO</th><th>CONDICIÓN / LÍMITE</th><th>PAGADO</th><th>SALDO</th>${actions ? '<th>ACCIONES</th>' : ''}</tr></thead><tbody>${list.map(q => {
        const p=paymentSummary(q);
        return `<tr><td><strong class="link" data-view-quote="${q.id}">${esc(q.folio)}</strong><br>${dateFmt(q.issue)}</td><td>${esc(quoteClient(q).name)}</td><td><b>${money(p.total)}</b></td><td>${tag(q.status)}</td><td>${tag(deliverySummary(q).status)}<small style="display:block">${num(deliverySummary(q).delivered)} entregados / ${num(deliverySummary(q).remaining)} pendientes</small></td><td>${tag(p.status)}</td><td>${esc(p.terms)}<br><small>${p.due ? dateFmt(p.due) : 'Sin fecha de pago'}</small></td><td>${money(p.paid)}</td><td>${money(p.balance)}${q.status==='Cancelada'?'<small style="display:block">Fuera de cartera</small>':''}</td>${actions ? `<td><div class="actions"><button class="btn btn-outline btn-sm" data-view-quote="${q.id}">Ver</button>${canEditQuotation(q)?`<button class="btn btn-outline btn-sm" data-edit-quote="${q.id}">Editar</button>`:''}${roleAllowed('quotations')?`<button class="btn btn-outline btn-sm" data-duplicate-quote="${q.id}">Nueva cotización similar</button>`:''}${q.status!=='Cancelada'?`<button class="btn btn-outline btn-sm" data-status-quote="${q.id}">Venta</button>`:''}<button class="btn btn-blue btn-sm" data-payment-quote="${q.id}">Pagos</button>${quotationWasConfirmed(q)?`<button class="btn btn-outline btn-sm" data-delivery-quote="${q.id}">Entregas</button>`:''}</div></td>` : ''}</tr>`;
    }).join('') || `<tr><td colspan="${actions?10:9}">Sin ventas</td></tr>`}</tbody></table></div>`;
}
function bindQuoteActions() {
    $$('[data-delivery-quote]').forEach(b=>b.onclick=()=>deliveryUI.open(b.dataset.deliveryQuote));
    $$('[data-payment-quote]').forEach(b => b.onclick = () => paymentsModal(b.dataset.paymentQuote));
    $$('[data-view-quote]').forEach(b => b.onclick = () => viewQuote(b.dataset.viewQuote));
    $$('[data-edit-quote]').forEach(b => b.onclick = () => openQuoteForm(b.dataset.editQuote));
    $$('[data-duplicate-quote]').forEach(b => b.onclick = () => duplicateQuote(b.dataset.duplicateQuote));
    $$('[data-status-quote]').forEach(b => b.onclick = () => statusQuote(b.dataset.statusQuote))
}
function renderQuotes() {
    setPage('Ventas', 'ÁREA COMERCIAL');
    const states = ['Confirmada','Cancelada'];
    const options=(values,selected)=>values.map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
    $('#content').innerHTML = sectionHead('Ventas', 'Registra una venta directa o continúa una venta creada desde una cotización.', '<button class="primary" id="newSale"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nueva venta</button>'+ (roleAllowed('quotations')?'<button class="secondary" id="newQuote">Ir a Cotizaciones</button>':'')) + `<div class="tabs quote-tabs"><button data-quote-mode="list">Listado</button><button data-quote-mode="tracking">Seguimiento de ventas</button></div><div class="toolbar quote-filters"><input class="search" id="quoteSearch" value="${esc(quoteFilters.search)}" placeholder="Buscar folio o cliente…"><select id="quoteStatus" aria-label="Estado de venta"><option value="">Todos los estados de venta</option>${options(states,quoteFilters.status)}</select><select id="quoteDeliveryStatus" aria-label="Estado de entrega"><option value="">Todos los estados de entrega</option>${options(['Sin entregar','Entrega parcial','Entregado'],quoteFilters.delivery)}</select><select id="quotePaymentStatus" aria-label="Estado de pago"><option value="">Todos los estados de pago</option>${options(PAYMENT_STATUSES,quoteFilters.payment)}</select><select id="quotePaymentTerms" aria-label="Condición de pago"><option value="">Contado y crédito</option>${options(PAYMENT_TERMS,quoteFilters.terms)}</select></div><section id="quoteListView"><article class="panel" id="quoteList"></article></section><section id="quoteTrackingView"><article class="panel"><div class="panel-head"><div><h3>Seguimiento de ventas</h3><p>Selecciona una tarjeta para consultar, editar o cambiar el estado.</p></div></div><div id="quoteBoard"></div></article></section>`;
    const refresh = () => {
        Object.assign(quoteFilters,{search:$('#quoteSearch').value,status:$('#quoteStatus').value,delivery:$('#quoteDeliveryStatus').value,payment:$('#quotePaymentStatus').value,terms:$('#quotePaymentTerms').value});
        const list = S.quotations.filter(q => quotationWasConfirmed(q) && (q.folio + quoteClient(q).name).toLowerCase().includes(quoteFilters.search.toLowerCase()) && (!quoteFilters.status || q.status === quoteFilters.status) && (!quoteFilters.delivery || deliverySummary(q).status===quoteFilters.delivery) && (!quoteFilters.payment || paymentSummary(q).status===quoteFilters.payment) && (!quoteFilters.terms || paymentSummary(q).terms===quoteFilters.terms)).sort((a,b)=>b.issue.localeCompare(a.issue));
        $('#quoteList').innerHTML = quoteTable(list);
        $('#quoteBoard').innerHTML=`<div class="kanban">${states.map(st=>{
            const rows=list.filter(q=>q.status===st);
            return `<section class="kanban-col"><div class="kanban-head"><span>${esc(st)}</span><span>${rows.length}</span></div>${rows.map(q=>`<article class="kanban-card" data-view-quote="${esc(q.id)}"><strong>${esc(q.folio)}</strong><small>${esc(quoteClient(q).name)}</small><strong style="margin-top:10px">${money(quoteTotals(q).total)}</strong><small>${tag(deliverySummary(q).status)} · ${num(deliverySummary(q).remaining)} pendientes</small><small>${tag(paymentSummary(q).status)} · ${esc(paymentSummary(q).terms)}</small><small>Pagado: ${money(paymentSummary(q).paid)} · Saldo: ${money(paymentSummary(q).balance)}</small><small>${dateFmt(q.issue)} · ${esc(q.user)}</small></article>`).join('') || '<p class="hint">Sin resultados</p>'}</section>`;
        }).join('')}</div>`;
        bindQuoteActions();
    };
    $('#newSale').onclick=()=>openQuoteForm(undefined,true);
    if($('#newQuote'))$('#newQuote').onclick = () => go('quotations');
    $('#quoteSearch').oninput = refresh;
    ['#quoteStatus','#quoteDeliveryStatus','#quotePaymentStatus','#quotePaymentTerms'].forEach(id=>$(id).onchange=refresh);
    const selectMode = mode => {
        quoteMode = mode === 'tracking' ? 'tracking' : 'list';
        $('#quoteListView').classList.toggle('hidden', quoteMode !== 'list');
        $('#quoteTrackingView').classList.toggle('hidden', quoteMode !== 'tracking');
        $$('[data-quote-mode]').forEach(button => button.classList.toggle('active', button.dataset.quoteMode === quoteMode));
    };
    $$('[data-quote-mode]').forEach(button => button.onclick = () => selectMode(button.dataset.quoteMode));
    refresh();
    selectMode(quoteMode);
}

function openQuoteForm(id, directSale=false) {
    const existing=id?S.quotations.find(q=>q.id===id):null;
    const sale=existing?quotationWasConfirmed(existing):directSale;
    if (!roleAllowed(sale?'quotes':'quotations')) {
        toast(sale?'Tu rol no tiene permiso para crear o modificar ventas':'Tu rol no tiene permiso para crear o modificar cotizaciones');
        return
    }
    const activeClients = S.clients.filter(c => c.status === 'Activo')
      , activeProducts = S.products.filter(p => p.active);
    if (!id && !activeProducts.length) {
        toast('Primero registra un producto activo');
        go('catalog');
        return
    }
    const firstProduct = activeProducts[0];
    const original = id ? S.quotations.find(q => q.id === id) : null;
    if (original && !canEditQuotation(original)) {
        toast('Solo un administrador puede modificar una venta confirmada');
        return
    }
    const draft = original ? structuredClone(original) : {
        id: uid(),
        folio: nextFolio(sale?'VEN':'COT', S.quotations.filter(q=>q.folio?.startsWith(sale?'VEN-':'COT-'))),
        clientId: '',
        clientName: '',
        clientCompany: '',
        clientPhone: '',
        clientEmail: '',
        clientAddress: '',
        clientType: 'public',
        issue: today(),
        due: sale?today():addDays(today(), S.company.validity || 15),
        status: sale?'Confirmada':'Pendiente',
        paymentTerms: 'Contado', paymentDue: '', payments: [], legacyPaymentOverdue: false, paymentMigrationNote: '',
        user: user().name,
        tax: FIXED_TAX_RATE,
        notes: '',
        items: [{
            id: uid(),
            productId: firstProduct.id,
            description: firstProduct.name,
            qty: 0,
            unit: firstProduct.unit,
            price: productTierPrice(firstProduct,'public'),
            priceTier: 'public',
            discount: 0
        }],
        history: []
    };
    draft.clientType ||= (draft.clientId?client(draft.clientId)?.type:'') || 'public';
    const selectableClients = S.clients.filter(c => c.status === 'Activo' || c.id === draft.clientId)
      , manualClient = !draft.clientId
      , savedClient = quoteClient(draft);
    openModal(original ? `Editar ${draft.folio}` : sale?'Nueva venta directa':'Nueva cotización', 'Elige un cliente registrado o escribe sus datos sin darlo de alta. Para un cliente sin registrar, solo el nombre es obligatorio.', `<div class="form-grid"><div class="field full"><label>CLIENTE</label><select id="qClient"><option value="__manual__" ${manualClient ? 'selected' : ''}>Cliente nuevo sin registrar</option>${selectableClients.map(c => `<option value="${c.id}" ${c.id === draft.clientId ? 'selected' : ''}>${esc(c.name)}${c.company ? ' · ' + esc(c.company) : ''}</option>`).join('')}</select></div><div class="field full"><label>TIPO DE CLIENTE / TARIFA INICIAL</label><select id="qClientType" ${manualClient?'':'disabled'}>${Object.entries(PRICE_TIERS).map(([key,label])=>`<option value="${key}" ${key===draft.clientType?'selected':''}>${label}</option>`).join('')}</select><small>Al cambiar de cliente o tipo se aplican sus precios de catálogo y se reinician los descuentos. Las operaciones guardadas conservan sus importes al abrirlas.</small></div><div class="field full ${manualClient ? '' : 'hidden'}" id="qManualFields"><div class="form-grid"><div class="field"><label>NOMBRE / CONTACTO (OBLIGATORIO)</label><input id="qClientName" value="${esc(savedClient.name === 'Cliente sin nombre' ? '' : savedClient.name)}"></div><div class="field"><label>EMPRESA / RAZÓN SOCIAL</label><input id="qClientCompany" value="${esc(savedClient.company)}"></div><div class="field"><label>TELÉFONO</label><input id="qClientPhone" value="${esc(savedClient.phone)}"></div><div class="field"><label>CORREO (OPCIONAL)</label><input type="email" id="qClientEmail" placeholder="Puedes dejarlo vacío" value="${esc(savedClient.email)}"></div><div class="field full"><label>DIRECCIÓN (OPCIONAL)</label><input id="qClientAddress" placeholder="Puedes dejarla vacía" value="${esc(savedClient.address)}"></div></div></div><div class="field"><label>FECHA DE EMISIÓN</label><input type="date" id="qIssue" value="${draft.issue}"></div><div class="field ${sale?'hidden':''}"><label>VIGENCIA HASTA</label><input type="date" id="qDue" value="${draft.due}"></div><div class="field"><label>CONDICIÓN DE PAGO</label><select id="qPaymentTerms">${PAYMENT_TERMS.map(t=>`<option ${t===(draft.paymentTerms || 'Contado')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>FECHA LÍMITE DE PAGO</label><input type="date" id="qPaymentDue" value="${esc(draft.paymentDue || '')}"><small>Obligatoria para crédito.</small></div></div><div class="quote-lines"><div class="panel-head"><div><h3>Productos de la venta</h3><p>El costo de cada pieza se calcula con la producción diaria del producto, aunque el cliente compre pocas piezas.</p></div><button class="btn btn-outline btn-sm" id="addLine"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Agregar producto</button></div><div class="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>DESCRIPCIÓN</th><th>CANT.</th><th>TARIFA</th><th>PRECIO CON IVA</th><th>DESC. %</th><th>IMPORTE</th><th></th></tr></thead><tbody id="lineRows"></tbody></table></div></div><div class="grid two" style="margin-top:15px"><div class="panel commercial-warning" id="commercialWarning" hidden></div><div><div class="field"><label>NOTAS Y CONDICIONES</label><textarea rows="4" id="qNotes">${esc(draft.notes)}</textarea></div><div class="field" style="margin-top:10px"><label>IVA INCLUIDO</label><input value="16% fijo" disabled></div><div class="totals" id="quoteTotals"></div></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveQuote">${sale?'Guardar venta':'Guardar cotización'}</button>`, true);
    function sync() {
        const selectedId = $('#qClient').value;
        if (selectedId === '__manual__') {
            draft.clientId = '';
            draft.clientName = $('#qClientName').value.trim();
            draft.clientCompany = $('#qClientCompany').value.trim();
            draft.clientPhone = $('#qClientPhone').value.trim();
            draft.clientEmail = $('#qClientEmail').value.trim();
            draft.clientAddress = $('#qClientAddress').value.trim()
        } else {
            const selectedClient = client(selectedId);
            draft.clientId = selectedId;
            draft.clientName = selectedClient.name;
            draft.clientCompany = selectedClient.company;
            draft.clientPhone = selectedClient.phone;
            draft.clientEmail = selectedClient.email;
            draft.clientAddress = selectedClient.address
        }
        draft.clientType = $('#qClientType').value || draft.clientType || 'public';
        draft.issue = $('#qIssue').value;
        draft.due = sale && !original?draft.issue:$('#qDue').value;
        draft.notes = $('#qNotes').value;
        draft.paymentTerms = $('#qPaymentTerms').value;
        draft.paymentDue = $('#qPaymentDue').value;
        if (draft.paymentDue) draft.legacyPaymentOverdue = false;
        draft.tax = FIXED_TAX_RATE
    }
    function totals() {
        sync();
        const t = quoteTotals(draft);
        $('#quoteTotals').innerHTML = `<div><span>Importe de partidas</span><b>${money(t.gross)}</b></div><div><span>Descuentos</span><b>− ${money(t.discount)}</b></div><div class="total-without-tax"><span>Subtotal</span><b>${money(t.subtotal)}</b></div><div><span>IVA ${FIXED_TAX_RATE}%</span><b>${money(t.tax)}</b></div><div class="grand"><span>Total</span><span>${money(t.total)}</span></div>`;
        const availability=commercialAvailability(draft.items,S.products,S.materials);
        const box=$('#commercialWarning');
        if(box){box.hidden=user().role!=='Administrador' || !availability.shortages.length;box.innerHTML=box.hidden?'':`<h3>${icon('triangle-alert')} Revisa la disponibilidad</h3><p>Faltan productos terminados: ${availability.shortages.map(r=>esc(r.name)+' ('+num(r.missing)+' piezas)').join(', ')}.</p><p>${availability.unknown?'Hay productos sin una fórmula completa; no se puede confirmar si los materiales alcanzan.':availability.insufficient?'Los materiales disponibles tampoco alcanzan para fabricar todo el faltante.':'Los materiales disponibles alcanzan para fabricar el faltante.'}</p><a class="secondary" href="#calculator" target="_blank" rel="noopener">Abrir calculadora en otra pestaña</a>`;}

    }
    function rows() {
        $('#lineRows').innerHTML = draft.items.map( (it, i) => {
            const production = productStandardCosts(product(it.productId), S.materials, productionSettings());
            return `<tr data-line="${i}"><td><select class="line-product">${S.products.filter(p => p.active).map(p => `<option value="${p.id}" ${p.id === it.productId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></td><td><input class="desc" value="${esc(it.description)}"></td><td><input class="qty" type="number" min="1" value="${it.qty}"></td><td><select class="line-tier">${Object.entries(PRICE_TIERS).map(([key,label]) => `<option value="${key}" ${key === (it.priceTier || 'public') ? 'selected' : ''}>${label}</option>`).join('')}</select><small>Mínimo: ${money(productTierPrice(product(it.productId), it.priceTier || 'public'))}</small></td><td><input class="price" type="number" min="0" step=".01" value="${it.price}"></td><td><input class="discount" type="number" min="0" max="100" value="${it.discount || 0}"></td><td><b class="line-amount">${money(it.qty * it.price * (1 - (it.discount || 0) / 100))}</b></td><td><button class="btn btn-danger btn-sm remove-line" aria-label="Quitar"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18" />  <path d="m6 6 12 12" /></svg></button></td></tr>`
        }).join('');
        $$('[data-line]').forEach(row => {
            const i = +row.dataset.line
              , it = draft.items[i];
            const updateRow = () => {
                $('.line-amount', row).textContent = money(it.qty * it.price * (1 - (it.discount || 0) / 100));
                totals()
            };
            $('.line-product', row).onchange = e => {
                const p = product(e.target.value);
                Object.assign(it, {
                    productId: p.id,
                    description: p.name,
                    unit: p.unit,
                    price: productTierPrice(p, it.priceTier || 'public')
                });
                rows();
                totals()
            }
            ;
            $('.line-tier', row).onchange = e => {
                it.priceTier = e.target.value;
                it.price = productTierPrice(product(it.productId), it.priceTier);
                it.discount = 0;
                rows(); totals();
            };
            $('.desc', row).oninput = e => it.description = e.target.value;
            $('.qty', row).oninput = e => {
                it.qty = +e.target.value || 0;
                updateRow()
            }
            ;
            $('.price', row).oninput = e => {
                it.price = +e.target.value || 0;
                updateRow()
            }
            ;
            $('.discount', row).oninput = e => {
                it.discount = +e.target.value || 0;
                updateRow()
            }
            ;
            $('.remove-line', row).onclick = () => {
                if (draft.items.length === 1)
                    return toast(sale?'La venta necesita al menos una partida':'La cotización necesita al menos una partida');
                draft.items.splice(i, 1);
                rows();
                totals()
            }
        }
        )
    }
    rows();
    totals();
    function applyClientPrices() {
        sync();
        draft.items.forEach(item=>{
            item.priceTier=draft.clientType;
            item.price=productTierPrice(product(item.productId),draft.clientType);
            item.discount=0;
        });
        rows();totals();
    }
    $('#qClient').onchange = () => {
        const manual=$('#qClient').value==='__manual__';
        $('#qManualFields').classList.toggle('hidden', !manual);
        $('#qClientType').disabled=!manual;
        $('#qClientType').value=manual?'public':client($('#qClient').value).type || 'public';
        applyClientPrices();
    };
    $('#qClientType').onchange=applyClientPrices;
    ['qIssue', 'qDue', 'qPaymentTerms', 'qPaymentDue', 'qNotes', 'qClientName', 'qClientCompany', 'qClientPhone', 'qClientEmail', 'qClientAddress'].forEach(x => $('#' + x).oninput = totals);
    $('#addLine').onclick = () => {
        const p = S.products.find(x => x.active) || S.products[0];
        draft.items.push({
            id: uid(),
            productId: p.id,
            description: p.name,
            qty: 0,
            unit: p.unit,
            price: productTierPrice(p,draft.clientType),
            priceTier: draft.clientType,
            discount: 0
        });
        rows();
        totals()
    }
    ;
    $('#saveQuote').onclick = async () => {
        const button=$('#saveQuote');if(button.disabled)return;
        sync();
        const customerName=draft.clientId?client(draft.clientId).name:draft.clientName;
        if (!customerName?.trim() || !draft.items.length)
            return toast('Completa el nombre del cliente y las partidas');
        if (user().role === 'Ventas') {
            try { assertQuotationPrices(draft, S.products); } catch (error) { return toast(error.message); }
        }
        button.disabled=true;
        const beforeSave = structuredClone({ quotations: S.quotations, activity: S.activity });
        if (original)
            Object.assign(original, draft);
        else {
            draft.history = [{
                status: draft.status,
                date: today(),
                user: user().name,
                note: sale?'Venta directa creada sin cotización':'Cotización creada'
            }];
            S.quotations.unshift(draft)
        }
        log(`${draft.folio} ${original ? 'actualizada' : 'creada'}`);
        if (!await save()) {
            S.quotations = beforeSave.quotations;
            S.activity = beforeSave.activity;
            button.disabled=false;
            return;
        }
        closeModal();
        toast(sale?(original?'Venta actualizada':'Venta directa guardada'):'Cotización guardada');
        go(quotationWasConfirmed(draft)?'quotes':'quotations')
    }
    ;
}
function viewQuote(id) {
    const selected=S.quotations.find(q=>q.id===id);
    if (!selected || !roleAllowed(quotationWasConfirmed(selected)?'quotes':'quotations')) {
        toast('Tu rol no tiene acceso a las cotizaciones');
        return
    }
    const q = S.quotations.find(x => x.id === id);
    if (!q || !roleAllowed(quotationWasConfirmed(q)?'quotes':'quotations'))
        return;
    q.tax = FIXED_TAX_RATE;
    const sale=quotationWasConfirmed(q);
    const c = quoteClient(q)
      , t = quoteTotals(q)
      , editAction = canEditQuotation(q)
        ? '<button class="secondary" id="editFromView">Editar</button>'
        : '<button class="secondary" disabled title="Solo un administrador puede editar una venta confirmada">Edición bloqueada</button>'
      , statusAction = q.status === 'Cancelada'
        ? '<button class="secondary" disabled>Estado final</button>'
        : sale?'<button class="secondary" id="statusFromView">Estado de venta</button>':`<button class="secondary" id="statusFromView">Cancelar cotización</button>${roleAllowed('quotes')?'<button class="primary" id="convertFromView">Convertir en venta</button>':''}`;
    openModal(`${sale?'Venta':'Cotización'} ${q.folio}`, `${q.status} · ${dateFmt(q.issue)}`, `<div class="doc"><div class="doc-top"><div class="doc-company"><img src="assets/logo-gromex.png" alt="GROMEX"><p class="hint">${esc(S.company.legal)}<br>${esc(S.company.rfc)} · ${esc(S.company.phone)}<br>${esc(S.company.email)}</p></div><div><div style="text-align:right">${tag(q.status)}</div><p class="hint">Emisión: ${dateFmt(q.issue)}${sale?'':`<br>Vigencia: ${dateFmt(q.due)}`}</p></div></div><div class="grid two"><div><small class="hint">CLIENTE</small><h3>${esc(c.name)}</h3><p class="hint">${esc(c.company)}<br>${esc(c.address)}<br>${esc(c.phone)} · ${esc(c.email)}</p></div><div class="doc-dual-total"><div><small class="hint">TOTAL SIN IVA</small><strong>${money(t.net)}</strong></div><div><small class="hint">TOTAL CON IVA</small><div class="doc-total">${money(t.total)}</div></div></div></div><div class="table-wrap" style="margin-top:20px"><table><thead><tr><th>DESCRIPCIÓN</th><th>CANTIDAD</th><th>PRECIO</th><th>DESC.</th><th>IMPORTE</th></tr></thead><tbody>${q.items.map(i => `<tr><td>${esc(i.description)}</td><td>${num(i.qty)} ${esc(i.unit)}</td><td>${money(i.price)}</td><td>${num(i.discount)}%</td><td><b>${money(i.qty * i.price * (1 - i.discount / 100))}</b></td></tr>`).join('')}</tbody></table></div><div class="totals"><div><span>Subtotal</span><b>${money(t.subtotal)}</b></div><div><span>Descuento</span><b>− ${money(t.discount)}</b></div><div class="total-without-tax"><span>Total sin IVA</span><b>${money(t.net)}</b></div><div><span>IVA ${q.tax}%</span><b>${money(t.tax)}</b></div><div class="grand"><span>Total con IVA</span><span>${money(t.total)}</span></div></div>${sale?paymentSummaryHtml(q):`<p class="hint">Condición propuesta: ${esc(q.paymentTerms || 'Contado')}. Propuesta comercial pendiente de aceptación.</p>`}<p class="hint" style="margin-top:18px">${esc(q.notes) || 'Cotización sujeta a disponibilidad de materiales y programa de producción.'}</p></div>`, `<button class="secondary" data-close>Cerrar</button>${editAction}${statusAction}${sale?'<button class="secondary" id="paymentsFromView">Pagos / abonos</button>':''}${quotationWasConfirmed(q)?'<button class="secondary" id="deliveriesFromView">Entregas</button>':''}<button class="btn btn-blue" id="printQuote">Imprimir / PDF</button>`, true);
    const documentTotals = $$('.totals > div', $('#modalRoot'));
    if (documentTotals.length >= 5) {
        $('span', documentTotals[0]).textContent = 'Importe de partidas';
        $('b', documentTotals[0]).textContent = money(t.gross);
        $('span', documentTotals[2]).textContent = 'Subtotal';
        $('span', documentTotals[3]).textContent = `IVA ${FIXED_TAX_RATE}%`;
        $('span', documentTotals[4]).textContent = 'Total'
    }
    if ($('#deliveriesFromView')) $('#deliveriesFromView').onclick=()=>deliveryUI.open(id);
    if($('#paymentsFromView'))$('#paymentsFromView').onclick = () => paymentsModal(id);
    if($('#convertFromView'))$('#convertFromView').onclick=()=>convertQuotation(id);
    $('#printQuote').onclick = () => printQuotation(id);
    const editButton = $('#editFromView');
    if (editButton)
        editButton.onclick = () => {
            closeModal();
            openQuoteForm(id)
        }
        ;
    const statusButton = $('#statusFromView');
    if (statusButton)
        statusButton.onclick = () => {
            closeModal();
            statusQuote(id)
        }
}
function printQuotation(id) {
    const q = S.quotations.find(x => x.id === id);
    if (!q || !roleAllowed(quotationWasConfirmed(q)?'quotes':'quotations'))
        return;
    q.tax = FIXED_TAX_RATE;
    const sale=quotationWasConfirmed(q);
    const c = quoteClient(q)
      , t = quoteTotals(q)
      , printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
        toast('Permite las ventanas emergentes para imprimir la cotización');
        return
    }
    const rows = q.items.map(i => `<tr><td>${esc(i.description)}</td><td>${num(i.qty)} ${esc(i.unit)}</td><td>${money(i.price)}</td><td>${num(i.discount)}%</td><td><b>${money(i.qty * i.price * (1 - i.discount / 100))}</b></td></tr>`).join('');
    printWindow.opener=null;printWindow.document.write(professionalReport(`<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>${esc(q.folio)} · ${sale?'Venta':'Cotización'}</title></head><body>${q.status === 'Cancelada' ? '<div class="cancel-watermark" aria-label="CANCELADA"><span>CANCELADA</span></div>' : ''}<main class="quote"><header class="top"><div><img class="logo" src="assets/logo-gromex.png" alt="GROMEX"><p class="company">${esc(S.company.legal)}<br>${esc(S.company.rfc)} · ${esc(S.company.phone)}<br>${esc(S.company.email)}${S.company.address ? `<br>${esc(S.company.address)}` : ''}</p></div><div class="folio"><h1>${sale?'Venta':'Cotización'}</h1><b>${esc(q.folio)}</b><div class="dates">Emisión: ${dateFmt(q.issue)}${sale?'':`<br>Vigencia: ${dateFmt(q.due)}`}</div><p><span class="status">${sale?'Venta':'Cotización'}: ${esc(q.status)}</span></p></div></header><section class="summary"><div class="client"><small>CLIENTE</small><h2>${esc(c.name)}</h2><p>${esc(c.company)}${c.company ? '<br>' : ''}${esc(c.address)}${c.address ? '<br>' : ''}${esc(c.phone)}${c.email ? ` · ${esc(c.email)}` : ''}</p></div><div class="amounts"><div><small>TOTAL SIN IVA</small><b>${money(t.net)}</b></div><div><small>TOTAL CON IVA</small><strong>${money(t.total)}</strong></div></div></section><table><thead><tr><th>DESCRIPCIÓN</th><th>CANTIDAD</th><th>PRECIO</th><th>DESC.</th><th>IMPORTE</th></tr></thead><tbody>${rows}</tbody></table><div class="bottom"><div class="totals"><div><span>Importe de partidas</span><b>${money(t.gross)}</b></div><div><span>Descuento</span><b>− ${money(t.discount)}</b></div><div><span>Subtotal</span><b>${money(t.net)}</b></div><div><span>IVA ${FIXED_TAX_RATE}%</span><b>${money(t.tax)}</b></div><div class="grand"><span>Total</span><b>${money(t.total)}</b></div></div></div>${sale?paymentSummaryHtml(q):`<p class="notes">Condición propuesta: ${esc(q.paymentTerms || 'Contado')}. Esta cotización es una propuesta comercial pendiente de aceptación.</p>`}<p class="notes">${esc(q.notes) || 'Cotización sujeta a disponibilidad de materiales y programa de producción.'}</p><p class="footer">${esc(S.company.name || 'CC GROMEX')} · ${esc(S.company.phone)} · ${esc(S.company.email)}</p></main></body></html>`,{company:S.company.name,landscape:false}));
    printWindow.document.close()
}
async function duplicateQuote(id) {
    if (!roleAllowed('quotations')) {
        toast('Tu rol no tiene permiso para crear cotizaciones');
        return
    }
    const q = S.quotations.find(x => x.id === id)
      , copy = structuredClone(q);
    copy.id = uid();
    copy.delivery=emptyDelivery();
    copy.folio = nextFolio('COT', S.quotations.filter(q=>q.folio?.startsWith('COT-')));
    copy.issue = today();
    copy.due = addDays(today(), S.company.validity || 15);
    copy.status = 'Pendiente';
    copy.paymentTerms = 'Contado'; copy.paymentDue = ''; copy.payments = []; copy.legacyPaymentOverdue = false; copy.paymentMigrationNote = '';
    copy.user = user().name;
    copy.items.forEach(i => {
        i.id = uid();
        if (user().role === 'Ventas') {
            i.price = productTierPrice(product(i.productId), i.priceTier || 'public');
            i.discount = 0;
        }
    });
    copy.history = [{
        status: 'Pendiente',
        date: today(),
        user: user().name,
        note: `Duplicada de ${q.folio}`
    }];
    if (user().role === 'Ventas') {
        try { assertQuotationPrices(copy, S.products); } catch (error) { return toast(error.message); }
    }
    const beforeSave = structuredClone({ quotations: S.quotations, activity: S.activity });
    S.quotations.unshift(copy);
    log(`${copy.folio} duplicada`);
    if (!await save()) {
        S.quotations = beforeSave.quotations;
        S.activity = beforeSave.activity;
        return;
    }
    toast(`Cotización duplicada: ${copy.folio}`);
    go('quotations')
}
async function convertQuotation(id) {
    try {Object.assign(S,await loadState());}catch(e){return toast(e.message);}
    if(!roleAllowed('quotations') || !roleAllowed('quotes'))return toast('Necesitas acceso a Cotizaciones y Ventas para convertir.');
    const q=S.quotations.find(q=>q.id===id);
    if(!q)return toast('Cotización no disponible.');
    if(quotationWasConfirmed(q))return toast('Esta cotización ya se convirtió en venta. Búscala en Ventas.');
    if(q.status!=='Pendiente')return toast('Solo puedes convertir una cotización pendiente.');
    openModal(`Convertir en venta · ${esc(q.folio)}`,'Confirma que el cliente aceptó la propuesta.',`<p><b>Cliente:</b> ${esc(quoteClient(q).name)}</p><p><b>Total con IVA:</b> ${money(quoteTotals(q).total)}</p><p>Se conservarán el folio, los productos, las cantidades y los precios cotizados. La operación aparecerá en Ventas, donde podrás registrar pagos y entregas.</p><p class="hint">Convertir no registra un cobro ni descuenta inventario. Las existencias se descuentan al entregar.</p>${q.due<businessToday()?'<p class="hint danger-text">La vigencia de esta cotización terminó. Verifica con el cliente que los precios y condiciones siguen acordados antes de confirmar.</p>':''}`, '<button class="secondary" data-close>Volver</button><button class="primary" id="confirmConversion">Confirmar y crear venta</button>');
    $('#confirmConversion').onclick=async()=>{
        const button=$('#confirmConversion');if(button.disabled)return;button.disabled=true;
        const before=structuredClone({quotation:q,activity:S.activity});
        q.status='Confirmada';
        q.history=[...(q.history || []),{status:'Confirmada',date:businessToday(),user:user().name,note:'Cotización convertida en venta'}];
        log(`${q.folio} convertida en venta`);
        if(!await save()){Object.assign(q,before.quotation);S.activity=before.activity;button.disabled=false;return;}
        closeModal();go('quotes');toast(`Venta creada desde ${q.folio}. Ya puedes registrar pagos y entregas.`);
    };
}
function statusQuote(id) {
    const selected=S.quotations.find(q=>q.id===id);
    if (!selected || !roleAllowed(quotationWasConfirmed(selected)?'quotes':'quotations')) {
        toast('Tu rol no tiene permiso para cambiar cotizaciones');
        return
    }
    const q = S.quotations.find(x => x.id === id);
    if (!q)
        return;
    if (q.status === 'Cancelada') {
        toast('La cotización está cancelada; su estado de venta es definitivo');
        return
    }
    const sale=quotationWasConfirmed(q);
    const availableStatuses = availableQuoteStatuses(q).filter(st=>sale || st!=='Confirmada')
      , subtitle = q.status === 'Confirmada'
        ? 'Una venta confirmada solamente puede cancelarse. Los cobros se registran desde Pagos / abonos.'
        : 'Cancela la propuesta si el cliente no la acepta. El registro se conserva para consulta.';
    openModal(`${sale?'Estado de venta':'Estado de cotización'} · ${q.folio}`, subtitle, `<div class="form-grid"><div class="field full"><label>${sale?'ESTADO DE VENTA':'ESTADO DE COTIZACIÓN'}</label><select id="newStatus">${availableStatuses.map(s => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field full"><label>NOTA DE SEGUIMIENTO</label><textarea id="statusNote" rows="3" placeholder="Comentario opcional"></textarea></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveStatus">Guardar estado</button>`);
    $('#saveStatus').onclick = async () => {
        if (user().role === 'Ventas' && $('#newStatus').value !== 'Cancelada') {
            try { assertQuotationPrices(q, S.products); } catch (error) { return toast(error.message); }
        }
        const beforeSave = structuredClone({ quotation: q, activity: S.activity });
        q.status = $('#newStatus').value;
        q.history = q.history || [];
        q.history.push({
            status: q.status,
            date: today(),
            user: user().name,
            note: $('#statusNote').value
        });
        log(`${q.folio} → ${q.status}`);
        if (!await save()) {
            Object.assign(q, beforeSave.quotation);
            S.activity = beforeSave.activity;
            return;
        }
        closeModal();
        toast('Estado actualizado');
        render()
    }
}
function renderClients() {
    setPage('Clientes', 'DIRECTORIO COMERCIAL');
    $('#content').innerHTML = sectionHead('Clientes', 'Directorio, datos de contacto e historial comercial.', '<button class="primary" id="newClient"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nuevo cliente</button>') + `<div class="toolbar"><input class="search" id="clientSearch" placeholder="Buscar nombre, empresa o teléfono…"><select id="clientTypeFilter"><option value="">Todos los tipos</option>${Object.entries(PRICE_TIERS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><select id="clientStatus"><option value="">Todos</option><option>Activo</option><option>Inactivo</option></select></div><div class="card-list" id="clientCards"></div>`;
    const refresh = () => {
        const s = $('#clientSearch').value.toLowerCase()
          , st = $('#clientStatus').value
          , list = S.clients.filter(c => (c.name + c.company + c.phone).toLowerCase().includes(s) && (!st || c.status === st) && (!$('#clientTypeFilter').value || (c.type || 'public') === $('#clientTypeFilter').value));
        $('#clientCards').innerHTML = list.map(c => {
            const qs = S.quotations.filter(q => q.clientId === c.id)
              , total = qs.filter(q => isSale(q)).reduce( (a, q) => a + quoteTotals(q).total, 0);
            return `<article class="entity-card"><header><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.company) || 'Cliente particular'}</div><div class="meta">${esc(PRICE_TIERS[c.type || 'public'])}</div></div>${tag(c.status)}</header><div class="big">${money(total)}</div><div class="meta">Saldo a favor: <b>${money(clientCredit(S.quotations,c.id,'9999-12-31',S.creditWithdrawals))}</b></div><div class="meta">Ventas confirmadas · ${qs.filter(q=>!q.folio?.startsWith('VEN-')).length} cotizaciones</div><div class="meta" style="margin-top:12px">${esc(c.phone)}<br>${esc(c.email)}</div><footer><button class="btn btn-outline btn-sm" data-client-detail="${c.id}">Ver historial</button><button class="btn btn-outline btn-sm" data-client-edit="${c.id}">Editar</button><button class="btn btn-danger btn-sm" data-client-delete="${c.id}">Eliminar</button></footer></article>`
        }
        ).join('') || empty('users', 'Sin clientes', 'No hay resultados con estos filtros.');
        $$('[data-client-edit]').forEach(b => b.onclick = () => clientModal(b.dataset.clientEdit));
        $$('[data-client-detail]').forEach(b => b.onclick = () => clientDetail(b.dataset.clientDetail));
        $$('[data-client-delete]').forEach(b => b.onclick = () => deleteClient(b.dataset.clientDelete))
    }
    ;
    $('#newClient').onclick = () => clientModal();
    $('#clientSearch').oninput = refresh;
    $('#clientStatus').onchange = refresh;
    $('#clientTypeFilter').onchange = refresh;
    refresh()
}
function clientModal(id) {
    const old = id ? S.clients.find(c => c.id === id) : null
      , c = old ? structuredClone(old) : {
        id: uid(),
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        status: 'Activo',
        type: 'public'
    };
    openModal(old ? 'Editar cliente' : 'Nuevo cliente', 'Información comercial y de contacto.', `<div class="form-grid"><div class="field"><label>NOMBRE / CONTACTO</label><input id="cName" value="${esc(c.name)}"></div><div class="field"><label>EMPRESA / RAZÓN SOCIAL</label><input id="cCompany" value="${esc(c.company)}"></div><div class="field"><label>TELÉFONO</label><input id="cPhone" value="${esc(c.phone)}"></div><div class="field"><label>CORREO</label><input type="email" id="cEmail" value="${esc(c.email)}"></div><div class="field full"><label>DIRECCIÓN</label><input id="cAddress" value="${esc(c.address)}"></div><div class="field"><label>TIPO DE CLIENTE / TARIFA</label><select id="cType">${Object.entries(PRICE_TIERS).map(([key,label])=>`<option value="${key}" ${key===(c.type || 'public')?'selected':''}>${label}</option>`).join('')}</select><small>Tarifa inicial para nuevas cotizaciones y ventas.</small></div><div class="field"><label>ESTADO</label><select id="cStatus"><option ${c.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${c.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveClient">Guardar cliente</button>`);
    $('#saveClient').onclick = async () => {
        const button=$('#saveClient');if(button.disabled)return;
        c.name = $('#cName').value.trim();
        if (!c.name)
            return toast('Escribe el nombre del cliente');
        c.company = $('#cCompany').value;
        c.phone = $('#cPhone').value;
        c.email = $('#cEmail').value;
        c.address = $('#cAddress').value;
        c.status = $('#cStatus').value;
        c.type = $('#cType').value;
        const before=structuredClone({clients:S.clients,activity:S.activity});
        button.disabled=true;
        if (old)
            Object.assign(S.clients.find(item=>item.id===c.id), c);
        else
            S.clients.push(c);
        log(`Cliente ${c.name} guardado`);
        if(!await save()){S.clients=before.clients;S.activity=before.activity;button.disabled=false;return;}
        closeModal();
        toast('Cliente guardado');
        render()
    }
}
function deleteClient(id) {
    const c = S.clients.find(item => item.id === id);
    if (!c || !window.confirm(`¿Eliminar al cliente "${c.name}"? Sus cotizaciones conservarán una copia de sus datos.`))
        return;
    S.quotations.filter(q => q.clientId === id).forEach(q => Object.assign(q, {
        clientId: '',
        clientName: c.name,
        clientCompany: c.company || '',
        clientPhone: c.phone || '',
        clientEmail: c.email || '',
        clientAddress: c.address || ''
    }));
    S.clients.splice(S.clients.findIndex(item => item.id === id), 1);
    log(`Cliente ${c.name} eliminado`);
    save();
    toast('Cliente eliminado; sus cotizaciones conservaron el historial');
    render()
}
function clientDetail(id) {
    const c = client(id)
      , qs = S.quotations.filter(q => q.clientId === id)
      , approved = qs.filter(q => isSale(q)).reduce( (s, q) => s + quoteTotals(q).total, 0);
    openModal(c.name, `${c.company || 'Cliente particular'} · ${PRICE_TIERS[c.type || 'public']}`, `<div class="metrics" style="grid-template-columns:repeat(3,1fr)">${stat('file-text', 'COTIZACIONES', qs.filter(q=>!q.folio?.startsWith('VEN-')).length, 'Histórico', 'blue')}${stat('check', 'VENTAS CONFIRMADAS', qs.filter(q => isSale(q)).length, 'Operaciones', 'teal')}${stat('banknote', 'VENTAS', money(approved), 'Monto aprobado', 'orange')}</div><p class="hint">${esc(c.address)} · ${esc(c.phone)} · ${esc(c.email)}</p><p>Saldo a favor disponible: <b>${money(clientCredit(S.quotations,c.id,'9999-12-31',S.creditWithdrawals))}</b>. Para usarlo, abre Pagos en una venta de este cliente.</p><div style="margin-top:16px"><button class="secondary" id="clientCreditHistory">Ver saldo a favor y retiros</button><h3>Cotizaciones</h3>${quotationUI.table(pendingQuotations(qs),false)}<h3 style="margin-top:20px">Ventas</h3>${quoteTable(qs.filter(quotationWasConfirmed))}</div>`, `<button class="secondary" data-close>Cerrar</button><button class="btn btn-danger" id="deleteClientFromDetail">Eliminar cliente</button>`, true);
    $('#clientCreditHistory').onclick=()=>operationsUI.credit(id);
    bindQuoteActions()
    $('#deleteClientFromDetail').onclick = () => {
        closeModal();
        deleteClient(id)
    }
}

function renderSuppliers() {
    setPage('Proveedores', 'COMPRAS Y ABASTECIMIENTO');
    $('#content').innerHTML = sectionHead('Proveedores', 'Directorio de abastecimiento y materiales suministrados.', '<button class="primary" id="newSupplier"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nuevo proveedor</button>') + `<div class="metrics">${stat('truck', 'PROVEEDORES', S.suppliers.length, 'Registrados', 'blue')}${stat('check', 'ACTIVOS', S.suppliers.filter(s => s.status === 'Activo').length, 'Disponibles para compra', 'teal')}${stat('warehouse', 'MATERIALES ASIGNADOS', S.materials.filter(m => S.suppliers.some(s => s.name === m.supplier)).length, 'Con proveedor identificado', 'orange')}${stat('banknote', 'VALOR ABASTECIDO', money(S.materials.reduce( (a, m) => a + m.stock * m.price, 0)), 'Inventario actual', 'blue')}</div><div class="toolbar"><input class="search" id="supplierSearch" placeholder="Buscar proveedor, contacto o categoría…"><select id="supplierStatus"><option value="">Todos</option><option>Activo</option><option>Inactivo</option></select></div><div class="card-list" id="supplierCards"></div>`;
    const refresh = () => {
        const q = $('#supplierSearch').value.toLowerCase()
          , st = $('#supplierStatus').value
          , list = S.suppliers.filter(s => (s.name + s.contact + s.category).toLowerCase().includes(q) && (!st || s.status === st));
        $('#supplierCards').innerHTML = list.map(s => {
            const mats = S.materials.filter(m => m.supplier === s.name)
              , value = mats.reduce( (a, m) => a + m.stock * m.price, 0);
            return `<article class="entity-card"><header><div><h3>${esc(s.name)}</h3><div class="meta">${esc(s.category) || 'Proveedor general'}</div></div>${tag(s.status)}</header><div class="big">${mats.length} <span class="hint">materiales</span></div><div class="meta">Valor actual: ${money(value)}</div><div class="meta" style="margin-top:12px"><b>${esc(s.contact)}</b><br>${esc(s.phone)}<br>${esc(s.email)}</div><footer><button class="btn btn-outline btn-sm" data-supplier-detail="${s.id}">Ver materiales</button><button class="btn btn-outline btn-sm" data-supplier-edit="${s.id}">Editar</button><button class="btn btn-danger btn-sm" data-supplier-delete="${s.id}">Eliminar</button></footer></article>`
        }
        ).join('') || empty('truck', 'Sin proveedores', 'No hay resultados con estos filtros.');
        $$('[data-supplier-detail]').forEach(b => b.onclick = () => supplierDetail(b.dataset.supplierDetail));
        $$('[data-supplier-edit]').forEach(b => b.onclick = () => supplierModal(b.dataset.supplierEdit));
        $$('[data-supplier-delete]').forEach(b => b.onclick = () => deleteSupplier(b.dataset.supplierDelete))
    }
    ;
    $('#newSupplier').onclick = () => supplierModal();
    $('#supplierSearch').oninput = refresh;
    $('#supplierStatus').onchange = refresh;
    refresh()
}
function supplierModal(id) {
    const old = id ? S.suppliers.find(s => s.id === id) : null
      , s = old ? structuredClone(old) : {
        id: uid(),
        name: '',
        rfc: '',
        contact: '',
        phone: '',
        email: '',
        address: '',
        category: '',
        terms: 'Contado',
        status: 'Activo'
    }
      , oldName = old?.name;
    openModal(old ? 'Editar proveedor' : 'Nuevo proveedor', 'Datos fiscales, contacto y condiciones comerciales.', `<div class="form-grid"><div class="field full"><label>NOMBRE / RAZÓN SOCIAL</label><input id="sName" value="${esc(s.name)}"></div><div class="field"><label>RFC</label><input id="sRfc" value="${esc(s.rfc)}"></div><div class="field"><label>CATEGORÍA</label><input id="sCategory" value="${esc(s.category)}" placeholder="Cemento, agregados, químicos…"></div><div class="field"><label>CONTACTO</label><input id="sContact" value="${esc(s.contact)}"></div><div class="field"><label>TELÉFONO</label><input id="sPhone" value="${esc(s.phone)}"></div><div class="field"><label>CORREO</label><input type="email" id="sEmail" value="${esc(s.email)}"></div><div class="field"><label>CONDICIONES DE PAGO</label><input id="sTerms" value="${esc(s.terms)}"></div><div class="field full"><label>DIRECCIÓN</label><input id="sAddress" value="${esc(s.address)}"></div><div class="field"><label>ESTADO</label><select id="sStatus"><option ${s.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${s.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveSupplier">Guardar proveedor</button>`);
    $('#saveSupplier').onclick = () => {
        s.name = $('#sName').value.trim();
        if (!s.name)
            return toast('Escribe el nombre del proveedor');
        s.rfc = $('#sRfc').value;
        s.category = $('#sCategory').value;
        s.contact = $('#sContact').value;
        s.phone = $('#sPhone').value;
        s.email = $('#sEmail').value;
        s.terms = $('#sTerms').value;
        s.address = $('#sAddress').value;
        s.status = $('#sStatus').value;
        if (old) {
            Object.assign(old, s);
            if (oldName !== s.name)
                S.materials.filter(m => m.supplier === oldName).forEach(m => m.supplier = s.name)
        } else
            S.suppliers.push(s);
        log(`Proveedor ${s.name} guardado`);
        save();
        closeModal();
        toast('Proveedor guardado');
        render()
    }
}
function deleteSupplier(id) {
    const s = S.suppliers.find(item => item.id === id);
    if (!s || !window.confirm(`¿Eliminar al proveedor "${s.name}"? Los materiales asociados quedarán sin proveedor.`))
        return;
    S.materials.filter(m => m.supplier === s.name).forEach(m => m.supplier = '');
    S.suppliers.splice(S.suppliers.findIndex(item => item.id === id), 1);
    log(`Proveedor ${s.name} eliminado`);
    save();
    toast('Proveedor eliminado');
    render()
}
function supplierDetail(id) {
    const s = S.suppliers.find(x => x.id === id)
      , mats = S.materials.filter(m => m.supplier === s.name)
      , value = mats.reduce( (a, m) => a + m.stock * m.price, 0);
    openModal(s.name, `${s.category} · ${s.terms}`, `<div class="metrics" style="grid-template-columns:repeat(3,1fr)">${stat('warehouse', 'MATERIALES', mats.length, 'Suministrados', 'blue')}${stat('banknote', 'VALOR ACTUAL', money(value), 'Inventario asociado', 'teal')}${stat('check', 'ESTADO', s.status, 'Relación comercial', 'orange')}</div><p class="hint"><b>${esc(s.contact)}</b> · ${esc(s.phone)} · ${esc(s.email)}<br>${esc(s.address)} · RFC ${esc(s.rfc) || 'No registrado'}</p><div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>MATERIAL</th><th>EXISTENCIA</th><th>COSTO POR COMPRA</th><th>VALOR</th></tr></thead><tbody>${mats.map(m => `<tr><td><strong>${esc(m.name)}</strong></td><td>${num(toInventoryQuantity(m, m.stock))} ${esc(inventoryUnit(m))}</td><td>${money(inventoryUnitPrice(m))} / ${esc(inventoryUnit(m))}</td><td>${money(m.stock * m.price)}</td></tr>`).join('') || '<tr><td colspan="4">No hay materiales asociados.</td></tr>'}</tbody></table></div>`, `<button class="secondary" data-close>Cerrar</button><button class="btn btn-danger" id="deleteSupplierFromDetail">Eliminar proveedor</button><button class="primary" id="editSupplierFromDetail">Editar proveedor</button>`, true);
    $('#editSupplierFromDetail').onclick = () => {
        closeModal();
        supplierModal(id)
    };
    $('#deleteSupplierFromDetail').onclick = () => {
        closeModal();
        deleteSupplier(id)
    }
}

function renderCatalog() {
    setPage('Fórmulas', 'PRODUCCIÓN · PRODUCTOS Y FÓRMULAS');
    const canManageCatalog = user().role === 'Administrador'
      , catalogActions = canManageCatalog ? '<button class="primary" id="catalogNew"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nuevo producto</button>' : ''
      , catalogDescription = canManageCatalog
        ? 'Administra productos, precios de venta y recetas de fabricación. Los materiales se gestionan únicamente desde Inventario.'
        : 'Consulta productos, precios, fichas técnicas y fórmulas de fabricación en modo de solo lectura.';
    $('#content').innerHTML = sectionHead('Productos y fórmulas', catalogDescription, catalogActions) + `<div class="catalog-grid">${S.products.map(p => {
            const costs = productStandardCosts(p, S.materials, productionSettings());
            const technical = p.technical || {}
              , dimensions = [technical.widthCm, technical.heightCm, technical.lengthCm].filter(Boolean).join(' × ')
              , resources = (p.costResources || []).map(resource => `<article class="catalog-resource"><div class="catalog-resource-head"><h4>${esc(resource.name)}</h4><span>${esc(resource.costType)}</span></div><dl><div><dt>Precio unitario</dt><dd>${money(resource.unitPrice)}</dd></div><div><dt>Costo por lote</dt><dd>${money(resource.batchCost)}</dd></div><div><dt>Cantidad por lote</dt><dd>${num(resource.batchQuantity)} ${esc(resource.unitCode)}</dd></div><div><dt>Cantidad por día</dt><dd>${num(resource.dailyQuantity)} ${esc(resource.unitCode)}</dd></div></dl></article>`).join('');
            const managementButtons = canManageCatalog ? `<footer><button class="btn btn-outline btn-sm" data-product-edit="${p.id}">Editar producto y fórmula</button><button class="btn btn-outline btn-sm" data-formula-delete="${p.id}">Eliminar fórmula</button><button class="btn btn-danger btn-sm" data-product-delete="${p.id}">Eliminar producto</button></footer>` : '<footer><span class="hint">Solo lectura</span></footer>';
            return `<article class="entity-card catalog-card"><header><div><h3>${esc(p.name)}</h3><div class="meta">${esc(p.sku)} · ${esc(p.unit)}${dimensions ? ` · ${dimensions} cm` : ''}</div></div>${tag(p.active ? 'Activo' : 'Inactivo')}</header><div class="recipe">${Object.entries(PRICE_TIERS).map(([key,label]) => `<div class="recipe-row"><span>${label}</span><b>${money(productTierPrice(p,key))}</b></div>`).join('')}<small>Precios por ${esc(p.unit)}, IVA incluido.</small></div><div class="meta">Costo directo: ${money(costs.directCostPerUnit)} · Indirecto estándar: ${moneyPrecise(costs.indirectPerUnit)} · Costo estimado por pieza: ${money(costs.totalPerUnit)} · Margen: ${money(p.price - costs.totalPerUnit)} (${profitPercent(p.price,costs.totalPerUnit)})</div><div class="metrics catalog-metrics">${stat('factory', 'PRODUCCIÓN DIARIA', num(technical.dailyPieces || 0), 'piezas', 'blue')}${stat('layers', 'PIEZAS POR OLLA', num(technical.piecesPerBatch || 0), `${num(technical.batchesPerDay || 0)} ollas/día`, 'teal')}${stat('banknote', 'COSTO DE REFERENCIA', money(technical.referenceUnitCost || 0), `Materialista vigente ${money(productTierPrice(p, 'materialist'))}`, 'orange')}</div><div class="recipe"><b style="font-size:10px">FÓRMULA DIRECTA POR ${esc((p.unit || 'pza').toUpperCase())}</b>${Object.entries(p.recipe || {}).filter(x => +x[1]).map( ([mid,q]) => `<div class="recipe-row"><span>${esc(material(mid).name)}</span><b>${num(q)} ${esc(material(mid).unit)}</b></div>`).join('') || '<p class="hint">Sin materiales configurados</p>'}</div><div class="recipe"><div class="recipe-row"><span>Producción semanal / mensual</span><b>${num(technical.weeklyPieces || 0)} / ${num(technical.monthlyPieces || 0)} pzas</b></div><div class="recipe-row"><span>Producción mínima / óptima</span><b>${num(technical.minimumBatches || 0)} / ${num(technical.optimalBatches || 0)} ollas</b></div><div class="recipe-row"><span>Indirectos estándar por ${esc(p.unit)}</span><b>${moneyPrecise(costs.indirectPerUnit)}</b></div></div>${resources ? `<details style="margin-top:14px"><summary><b>Ver materiales y gastos del producto</b></summary><div class="catalog-resources">${resources}</div></details>` : ''}${managementButtons}</article>`
        }
        ).join('') || empty('layers', 'Sin productos', 'Crea el primer producto y configura su fórmula.')}</div>`;
    $$('[data-product-edit]').forEach(b => b.onclick = () => productModal(b.dataset.productEdit));
    $$('[data-formula-delete]').forEach(b => b.onclick = () => deleteFormula(b.dataset.formulaDelete));
    $$('[data-product-delete]').forEach(b => b.onclick = () => deleteProduct(b.dataset.productDelete));
    if (canManageCatalog)
        $('#catalogNew').onclick = () => productModal()
}
function productModal(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol solamente puede consultar productos y fórmulas');
        return
    }
    const old = id ? S.products.find(p => p.id === id) : null
      , p = old ? structuredClone(old) : {
        id: uid(),
        name: '',
        sku: '',
        unit: 'pza',
        price: 0,
        stock: 0,
        active: true,
        recipe: {},
        technical: {},
        costResources: []
    };
    p.technical = {
        category: 'Block', hasCover: false, widthCm: 0, heightCm: 0, lengthCm: 0,
        piecesPerBatch: 0, batchesPerDay: 0, minimumBatches: 0, optimalBatches: 0,
        dailyPieces: 0, weeklyPieces: 0, monthlyPieces: 0, referenceUnitCost: 0,
        materialistUnitPrice: 0, ...(p.technical || {})
    };
    p.costResources ||= [];
    const initialBatchYield = Math.max(1, +p.technical.piecesPerBatch || 1)
      , selectedRecipe = Object.fromEntries(Object.entries(p.recipe || {}).map(([materialId, perUnit]) => [materialId, (+perUnit || 0) * initialBatchYield]))
      , arenaConversion = S.unitConversions.find(conversion => conversion.active && conversion.from === 'lata' && conversion.to === 'm3')?.factor || 0.019
      , productUnits = S.units.filter(unit => (unit.active || unit.code === p.unit) && !['Moneda', 'Tiempo'].includes(unit.category))
      , productUnitOptions = productUnits.map(unit => `<option value="${esc(unit.code)}" ${unit.code === p.unit ? 'selected' : ''}>${esc(unit.name)} (${esc(unit.symbol)})</option>`).join('');
    const standardCosts = productStandardCosts(p, S.materials, productionSettings());
    openModal(old ? 'Editar producto y fórmula' : 'Nuevo producto', 'Indica cuántas piezas salen de cada olla y qué materiales se necesitan.', `<div class="form-grid"><div class="field full"><label>NOMBRE DEL PRODUCTO</label><input id="pName" value="${esc(p.name)}"></div><div class="field"><label>CÓDIGO DEL PRODUCTO</label><input id="pSku" value="${esc(p.sku)}"></div><div class="field"><label>UNIDAD DEL PRODUCTO</label><select id="pUnit">${productUnitOptions}</select><small>Opciones tomadas de la base de datos.</small></div><div class="field"><label>PRECIO PÚBLICO GENERAL (CON IVA)</label><input type="number" min="0" step=".01" id="pPrice" value="${p.price}"></div><div class="field"><label>PRECIO CASAS MATERIALISTAS (CON IVA)</label><input type="number" min="0" step=".01" id="pSaleMaterialist" value="${p.materialistPrice ?? p.price}"></div><div class="field"><label>PRECIO OBRAS COMPLETAS (CON IVA)</label><input type="number" min="0" step=".01" id="pSaleProject" value="${p.projectPrice ?? p.price}"></div><div class="field"><label>EXISTENCIA MÍNIMA POR ALMACÉN</label><input type="number" min="0" step="1" id="pMinStock" value="${p.min || 0}"><small>0: avisar solo cuando esté agotado.</small></div><div class="field"><label>EXISTENCIA ACTUAL</label><input type="number" id="pStock" value="${p.stock || 0}" readonly><small>Se actualiza únicamente desde Inventario.</small></div><div class="field"><label>ESTADO</label><select id="pActive"><option value="1" ${p.active ? 'selected' : ''}>Activo</option><option value="0" ${!p.active ? 'selected' : ''}>Inactivo</option></select></div></div><div class="panel" style="margin-top:16px"><h3 style="font-size:13px">Medidas y producción diaria</h3><div class="form-grid" style="margin-top:12px"><div class="field"><label>TIPO</label><select id="pHasCover"><option value="0" ${!p.technical.hasCover ? 'selected' : ''}>Sin tapa / relleno</option><option value="1" ${p.technical.hasCover ? 'selected' : ''}>Con tapa</option></select></div><div class="field"><label>ANCHO × ALTO × LARGO (CM)</label><div class="actions"><input type="number" min="0" step=".1" id="pWidth" value="${p.technical.widthCm}"><input type="number" min="0" step=".1" id="pHeight" value="${p.technical.heightCm}"><input type="number" min="0" step=".1" id="pLength" value="${p.technical.lengthCm}"></div></div><div class="field"><label>PIEZAS PRODUCIDAS POR OLLA / LOTE</label><input type="number" min="1" step="any" id="pPiecesBatch" value="${p.technical.piecesPerBatch}"></div><div class="field"><label>OLLAS / LOTES POR DÍA</label><input type="number" min="0" step="any" id="pBatchesDay" value="${p.technical.batchesPerDay}"></div><div class="field"><label>PRODUCCIÓN MÍNIMA / ÓPTIMA</label><div class="actions"><input type="number" min="0" step="any" id="pMinBatches" value="${p.technical.minimumBatches}"><input type="number" min="0" step="any" id="pOptBatches" value="${p.technical.optimalBatches}"></div></div><div class="field"><label>COSTO DE REFERENCIA</label><input type="number" min="0" step=".01" id="pReferenceCost" value="${p.technical.referenceUnitCost}"></div></div><div class="recipe" id="pTechProduction"></div></div><div class="panel" style="margin-top:16px"><h3 style="font-size:13px">Materiales consumidos por olla / lote</h3><p class="hint">Captura el consumo completo del lote. El sistema lo divide automáticamente entre las piezas producidas.</p><div class="field" style="margin-top:12px"><label>BUSCAR MATERIAL</label><input id="pMaterialSearch" placeholder="Ej. ARE-LAT, arena, cemento…" autocomplete="off"></div><div id="pMaterialResults" style="margin-top:10px"></div><div id="pSelectedMaterials" style="margin-top:14px"></div><p class="hint">Para arena se utiliza la unidad lata: 1 lata = ${num(arenaConversion)} m³.</p></div><div class="panel" style="margin-top:16px"><h3 style="font-size:13px">Resumen del costo por pieza</h3><p class="hint">Los gastos fijos por pieza se calculan con la producción diaria de este producto.</p><div class="recipe" id="pCostSummary"><div class="recipe-row"><span>Costo directo por ${esc(p.unit)}</span><b>${money(standardCosts.directCostPerUnit)}</b></div><div class="recipe-row"><span>Indirectos mensuales / diarios</span><b>${money(standardCosts.indirectMonthlyCost)} / ${money(standardCosts.indirectDailyCost)}</b></div><div class="recipe-row"><span>Meta diaria</span><b>${num(standardCosts.standardDailyProduction)} ${esc(p.unit)}</b></div><div class="recipe-row"><span>Indirecto por ${esc(p.unit)}</span><b>${moneyPrecise(standardCosts.indirectPerUnit)}</b></div><div class="recipe-row"><span>Costo total estimado</span><b>${money(standardCosts.totalPerUnit)} / ${esc(p.unit)}</b></div></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveProduct">Guardar producto</button>`, true);
    const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isFormulaArena = m => /arena/i.test(m.name) && m.unit === 'lata';
    const availableFormulaMaterials = S.materials.filter(m => !/arena/i.test(m.name) || isFormulaArena(m));
    const renderSelectedMaterials = () => {
        const rows = Object.entries(selectedRecipe).map(([materialId, quantity]) => {
            const m = S.materials.find(item => item.id === materialId);
            if (!m) return '';
            const arena = isFormulaArena(m)
              , batchYield = Math.max(1, +$('#pPiecesBatch').value || 1)
              , equivalent = arena ? (+quantity || 0) * arenaConversion : 0
              , perUnit = (+quantity || 0) / batchYield;
            return `<tr data-selected-material="${esc(m.id)}"><td data-label="Material"><strong>${esc(m.name)}</strong><small style="display:block">${esc(m.code || 'Sin código')}</small></td><td data-label="Cantidad por olla"><input aria-label="Cantidad consumida por olla" type="number" min="0.000001" step="any" data-recipe="${esc(m.id)}" value="${quantity || ''}" placeholder="Cantidad por olla"></td><td data-label="Unidad / equivalencia"><b>${arena ? 'latas' : esc(m.unit)}</b>${arena ? `<small data-arena-equivalent style="display:block">${num(equivalent)} m³ por olla</small>` : ''}<small data-per-unit style="display:block">${num(perUnit)} ${esc(m.unit)} por pieza</small></td><td data-label="Costo actual">${money(m.price)} / ${esc(m.unit)}</td><td><button type="button" class="btn btn-danger btn-sm" data-recipe-remove="${esc(m.id)}">Quitar</button></td></tr>`
        }).join('');
        $('#pSelectedMaterials').innerHTML = rows ? `<div class="table-wrap"><table><thead><tr><th>MATERIAL</th><th>CANTIDAD POR OLLA</th><th>UNIDAD / EQUIVALENCIA</th><th>COSTO ACTUAL</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="hint">Aún no has agregado materiales a la fórmula.</p>';
        $$('[data-recipe]').forEach(input => input.oninput = () => {
            selectedRecipe[input.dataset.recipe] = +input.value || 0;
            const row = input.closest('[data-selected-material]')
              , m = S.materials.find(item => item.id === input.dataset.recipe)
              , conversionLabel = $('[data-arena-equivalent]', row)
              , perUnitLabel = $('[data-per-unit]', row)
              , batchYield = Math.max(1, +$('#pPiecesBatch').value || 1);
            if (conversionLabel && isFormulaArena(m)) conversionLabel.textContent = `${num((+input.value || 0) * arenaConversion)} m³ por olla`;
            if (perUnitLabel) perUnitLabel.textContent = `${num((+input.value || 0) / batchYield)} ${m.unit} por pieza`;
            updateCostSummary()
        });
        $$('[data-recipe-remove]').forEach(button => button.onclick = () => {
            delete selectedRecipe[button.dataset.recipeRemove];
            renderSelectedMaterials();
            renderMaterialResults();
            updateCostSummary()
        })
    };
    const renderMaterialResults = () => {
        const query = normalizeSearch($('#pMaterialSearch').value);
        if (!query) {
            $('#pMaterialResults').innerHTML = '<p class="hint">Escribe parte del código o nombre del material.</p>';
            return
        }
        const matches = availableFormulaMaterials.filter(m => normalizeSearch(`${m.code} ${m.name}`).includes(query)).slice(0, 8);
        $('#pMaterialResults').innerHTML = matches.length ? `<div class="table-wrap"><table><tbody>${matches.map(m => `<tr><td><strong>${esc(m.name)}</strong><small style="display:block">${esc(m.code || 'Sin código')} · ${money(m.price)} / ${esc(m.unit)}</small></td><td><button type="button" class="btn btn-outline btn-sm" data-recipe-add="${esc(m.id)}" ${Object.hasOwn(selectedRecipe, m.id) ? 'disabled' : ''}>${Object.hasOwn(selectedRecipe, m.id) ? 'Agregado' : 'Agregar'}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No se encontraron materiales. El catálogo se administra desde Inventario.</p>';
        $$('[data-recipe-add]').forEach(button => button.onclick = () => {
            selectedRecipe[button.dataset.recipeAdd] = 0;
            $('#pMaterialSearch').value = '';
            renderSelectedMaterials();
            renderMaterialResults();
            updateCostSummary();
            $(`[data-recipe="${button.dataset.recipeAdd}"]`)?.focus()
        })
    };
    const updateCostSummary = () => {
        const batchYield = Math.max(1, +$('#pPiecesBatch').value || 1)
          , unit = $('#pUnit').value || p.unit
          , recipe = Object.fromEntries(Object.entries(selectedRecipe).map(([materialId, batchQuantity]) => [materialId, (+batchQuantity || 0) / batchYield]))
          , costs = productStandardCosts({ ...p, unit, recipe, technical:{...p.technical,dailyPieces:batchYield*(+$('#pBatchesDay').value || 0),piecesPerBatch:batchYield,batchesPerDay:+$('#pBatchesDay').value || 0} }, S.materials, productionSettings());
        $('#pCostSummary').innerHTML = `<div class="recipe-row"><span>Costo directo por ${esc(unit)}</span><b>${money(costs.directCostPerUnit)}</b></div><div class="recipe-row"><span>Indirectos mensuales / diarios</span><b>${money(costs.indirectMonthlyCost)} / ${money(costs.indirectDailyCost)}</b></div><div class="recipe-row"><span>Meta diaria estándar</span><b>${num(costs.standardDailyProduction)} ${esc(unit)}</b></div><div class="recipe-row"><span>Indirecto por ${esc(unit)}</span><b>${moneyPrecise(costs.indirectPerUnit)}</b></div><div class="recipe-row"><span>Costo estimado por pieza</span><b>${money(costs.totalPerUnit)} / ${esc(unit)}</b></div>`
    };
    $('#pMaterialSearch').oninput = renderMaterialResults;
    $('#pUnit').onchange = updateCostSummary;
    renderSelectedMaterials();
    renderMaterialResults();
    const updateTechnicalProduction = () => {
        const daily = (+$('#pPiecesBatch').value || 0) * (+$('#pBatchesDay').value || 0);
        $('#pTechProduction').innerHTML = `<div class="recipe-row"><span>Producción diaria calculada</span><b>${num(daily)} pzas</b></div><div class="recipe-row"><span>Producción semanal (6 días)</span><b>${num(daily * 6)} pzas</b></div><div class="recipe-row"><span>Producción mensual (24 días)</span><b>${num(daily * 24)} pzas</b></div>`;
        renderSelectedMaterials();
        updateCostSummary()
    };
    $('#pPiecesBatch').oninput = updateTechnicalProduction;
    $('#pBatchesDay').oninput = updateTechnicalProduction;
    updateTechnicalProduction();
    $('#saveProduct').onclick = () => {
        p.name = $('#pName').value.trim();
        if (!p.name)
            return toast('Escribe el nombre del producto');
        p.sku = $('#pSku').value;
        p.unit = $('#pUnit').value || 'pza';
        const prices = ['pPrice', 'pSaleMaterialist', 'pSaleProject'].map(id => Number($('#' + id).value));
        if (prices.some(value => !Number.isFinite(value) || value < 0)) return toast('Los precios deben ser números mayores o iguales a cero');
        [p.price, p.materialistPrice, p.projectPrice] = prices;
        const minimum=Number($('#pMinStock').value);
        if($('#pMinStock').value==='' || !Number.isSafeInteger(minimum) || minimum<0)return toast('El stock mínimo debe ser un entero no negativo.');
        p.min=minimum;
        p.active = $('#pActive').value === '1';
        const batchYield = +$('#pPiecesBatch').value || 0;
        if (!(batchYield > 0)) return toast('Indica cuántas piezas produce una olla o lote');
        const dailyPieces = batchYield * (+$('#pBatchesDay').value || 0);
        Object.assign(p.technical, {
            hasCover: $('#pHasCover').value === '1',
            widthCm: +$('#pWidth').value || 0,
            heightCm: +$('#pHeight').value || 0,
            lengthCm: +$('#pLength').value || 0,
            piecesPerBatch: +$('#pPiecesBatch').value || 0,
            batchesPerDay: +$('#pBatchesDay').value || 0,
            minimumBatches: +$('#pMinBatches').value || 0,
            optimalBatches: +$('#pOptBatches').value || 0,
            dailyPieces,
            weeklyPieces: dailyPieces * 6,
            monthlyPieces: dailyPieces * 24,
            referenceUnitCost: +$('#pReferenceCost').value || 0,
            materialistUnitPrice: p.materialistPrice
        });
        const missingQuantity = Object.keys(selectedRecipe).find(materialId => !(+selectedRecipe[materialId] > 0));
        if (missingQuantity)
            return toast(`Indica cuánto se requiere de ${material(missingQuantity).name}`);
        p.recipe = {};
        $$('[data-recipe]').forEach(i => {
            if (+i.value) p.recipe[i.dataset.recipe] = (+i.value || 0) / batchYield
        });
        if (old)
            Object.assign(old, p);
        else
            S.products.push(p);
        log(`Producto ${p.name} guardado`);
        save();
        closeModal();
        toast('Producto y fórmula guardados');
        render()
    }
}
function deleteFormula(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol solamente puede consultar productos y fórmulas');
        return
    }
    const p = S.products.find(item => item.id === id);
    if (!p || !Object.keys(p.recipe || {}).length)
        return toast('Este producto no tiene una fórmula registrada');
    if (!window.confirm(`¿Eliminar los materiales de la fórmula de "${p.name}"? El producto se conservará.`))
        return;
    p.recipe = {};
    log(`Fórmula de ${p.name} eliminada`);
    save();
    toast('Fórmula eliminada');
    render()
}
function deleteProduct(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol solamente puede consultar productos y fórmulas');
        return
    }
    const p = S.products.find(item => item.id === id);
    if (!p)
        return;
    const quotations = S.quotations.filter(q => q.items?.some(item => item.productId === id)).length
      , orders = S.orders.filter(order => order.productId === id).length
      , movements = S.movements.filter(movement => movement.productId === id).length;
    if (quotations || orders || movements)
        return toast(`No se puede eliminar: tiene ${quotations} cotización(es), ${orders} orden(es) y ${movements} movimiento(s). Puedes marcarlo Inactivo.`);
    if (!window.confirm(`¿Eliminar el producto "${p.name}" y su fórmula?`))
        return;
    S.products.splice(S.products.findIndex(item => item.id === id), 1);
    log(`Producto ${p.name} y su fórmula eliminados`);
    save();
    toast('Producto y fórmula eliminados');
    render()
}
function materialModal(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol no puede modificar el catálogo de materiales');
        return
    }
    const old = id ? S.materials.find(m => m.id === id) : null
      , m = old ? structuredClone(old) : {
        id: uid(),
        code: '',
        name: '',
        unit: 'kg',
        stock: 0,
        min: 0,
        max: 0,
        price: 0,
        purchaseUnit: 'kg',
        purchasePrice: 0,
        conversionFactor: 1,
        icon: 'MT',
        supplier: S.suppliers[0]?.name || ''
    };
    m.purchaseUnit ||= m.unit;
    m.conversionFactor = Math.max(0.000001, +m.conversionFactor || 1);
    m.purchasePrice = Number.isFinite(+m.purchasePrice) ? +m.purchasePrice : (+m.price || 0) * m.conversionFactor;
    const availableUnits = S.units.filter(unit => unit.active || unit.code === m.unit || unit.code === m.purchaseUnit)
      , unitOptions = selected => availableUnits.map(unit => `<option value="${esc(unit.code)}" ${unit.code === selected ? 'selected' : ''}>${esc(unit.name)} (${esc(unit.symbol)})</option>`).join('');
    const initialStock = toInventoryQuantity(m, m.stock)
      , initialMin = toInventoryQuantity(m, m.min)
      , initialMax = toInventoryQuantity(m, m.max);
    openModal(old ? 'Editar material' : 'Nuevo material', 'La unidad de compra también será la unidad utilizada en Inventario.', `<div class="form-grid"><div class="field full"><label>NOMBRE</label><input id="mName" value="${esc(m.name)}"></div><div class="field"><label>CÓDIGO</label><input id="mCode" value="${esc(m.code || '')}"></div><div class="field"><label>UNIDAD PARA FÓRMULAS / CONSUMO</label><select id="mUnit">${unitOptions(m.unit)}</select><small>Unidad usada para calcular la fórmula, por ejemplo kg.</small></div><div class="field"><label>UNIDAD DE COMPRA E INVENTARIO</label><select id="mPurchaseUnit">${unitOptions(m.purchaseUnit)}</select><small>Las existencias, entradas y salidas se mostrarán en esta unidad.</small></div><div class="field"><label>PRECIO POR UNIDAD DE COMPRA</label><input type="number" min="0" step="any" id="mPurchasePrice" value="${m.purchasePrice}"></div><div class="field"><label>UNIDADES DE CONSUMO POR UNIDAD COMPRADA</label><input type="number" min="0.000001" step="any" id="mFactor" value="${m.conversionFactor}"><small id="mFactorFormula">Ejemplo: 1 tonelada contiene 1,000 kg.</small></div><div class="field"><label>COSTO CALCULADO POR UNIDAD DE CONSUMO</label><input type="number" id="mPrice" value="${m.price}" readonly><small id="mCostFormula"></small></div><div class="field"><label>PROVEEDOR</label><select id="mSupplier"><option value="">Sin proveedor</option>${S.suppliers.filter(s => s.status === 'Activo').map(s => `<option value="${esc(s.name)}" ${s.name === m.supplier ? 'selected' : ''}>${esc(s.name)} · ${esc(s.category)}</option>`).join('')}</select></div><div class="field"><label>EXISTENCIA ACTUAL</label><input type="number" min="0" step="any" id="mStock" ${old ? 'readonly' : ''} value="${initialStock}"><small class="inventory-unit-help"></small></div><div class="field"><label>STOCK MÍNIMO</label><input type="number" min="0" step="any" id="mMin" value="${initialMin}"><small class="inventory-unit-help"></small></div><div class="field"><label>CAPACIDAD / MÁXIMO</label><input type="number" min="0" step="any" id="mMax" value="${initialMax}"><small class="inventory-unit-help"></small></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveMaterial">Guardar material</button>`);
    let displayedFactor = m.conversionFactor;
    const adjustInventoryQuantities = newFactor => {
        const safeFactor = Math.max(0.000001, +newFactor || 0);
        ['#mStock', '#mMin', '#mMax'].forEach(selector => {
            const input = $(selector)
              , normalizedQuantity = Math.max(0, +input.value || 0) * displayedFactor;
            input.value = normalizedQuantity / safeFactor
        });
        displayedFactor = safeFactor
    };
    const updateUnitCost = () => {
        const purchasePrice = Math.max(0, +$('#mPurchasePrice').value || 0)
          , factor = Math.max(0.000001, +$('#mFactor').value || 0)
          , unitCost = purchasePrice / factor;
        $('#mPrice').value = unitCost.toFixed(6);
        $('#mCostFormula').textContent = `${money(purchasePrice)} ÷ ${num(factor)} = ${moneyPrecise(unitCost)} por ${$('#mUnit').value}`;
        $('#mFactorFormula').textContent = `1 ${$('#mPurchaseUnit').value} = ${num(factor)} ${$('#mUnit').value}`;
        $$('.inventory-unit-help').forEach(label => label.textContent = `Cantidad expresada en ${$('#mPurchaseUnit').value}`)
    };
    const applyKnownConversion = () => {
        const purchaseUnit = $('#mPurchaseUnit').value
          , consumptionUnit = $('#mUnit').value
          , known = S.unitConversions.find(conversion => conversion.active && conversion.from === purchaseUnit && conversion.to === consumptionUnit);
        if (purchaseUnit === consumptionUnit)
            $('#mFactor').value = 1;
        else if (known)
            $('#mFactor').value = known.factor;
        adjustInventoryQuantities($('#mFactor').value);
        updateUnitCost()
    };
    $('#mPurchasePrice').oninput = updateUnitCost;
    $('#mFactor').oninput = updateUnitCost;
    $('#mFactor').onchange = () => adjustInventoryQuantities($('#mFactor').value);
    $('#mUnit').onchange = applyKnownConversion;
    $('#mPurchaseUnit').onchange = applyKnownConversion;
    updateUnitCost();
    $('#saveMaterial').onclick = () => {
        m.name = $('#mName').value.trim();
        if (!m.name)
            return toast('Escribe el nombre del material');
        m.code = $('#mCode').value.trim();
        m.unit = $('#mUnit').value;
        if (!S.units.some(unit => unit.code === m.unit && unit.active))
            return toast('Selecciona una unidad de medida activa');
        m.supplier = $('#mSupplier').value;
        m.purchaseUnit = $('#mPurchaseUnit').value;
        if (!S.units.some(unit => unit.code === m.purchaseUnit && unit.active))
            return toast('Selecciona una unidad de compra e inventario activa');
        m.purchasePrice = Math.max(0, +$('#mPurchasePrice').value || 0);
        m.conversionFactor = Math.max(0.000001, +$('#mFactor').value || 0);
        m.price = m.purchasePrice / m.conversionFactor;
        m.stock = fromInventoryQuantity(m, Math.max(0, +$('#mStock').value || 0));
        m.min = fromInventoryQuantity(m, Math.max(0, +$('#mMin').value || 0));
        m.max = fromInventoryQuantity(m, Math.max(0, +$('#mMax').value || 0));
        if (m.max && m.max < m.min)
            return toast('La capacidad máxima no puede ser menor que el stock mínimo');
        m.icon = m.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
        if (old)
            Object.assign(old, m);
        else
            S.materials.push(m);
        log(`Material ${m.name} guardado`);
        save();
        closeModal();
        toast('Material guardado');
        render()
    }
}
function deleteMaterial(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol no puede eliminar materiales');
        return
    }
    const m = S.materials.find(item => item.id === id);
    if (!m)
        return;
    const movements = S.movements.filter(movement => movement.materialId === id).length;
    if (movements)
        return toast(`No se puede eliminar: el material tiene ${movements} movimiento(s). Elimina primero esos registros en Inventario.`);
    const productionOrders = S.orders.filter(order => (order.materials || []).some(item => item.materialId === id)).length;
    if (productionOrders)
        return toast(`No se puede eliminar: el material está ligado a ${productionOrders} orden(es) de producción.`);
    if (!window.confirm(`¿Eliminar el material "${m.name}"? También se quitará de las fórmulas donde esté incluido.`))
        return;
    S.products.forEach(p => delete p.recipe?.[id]);
    S.products.forEach(p => p.costResources = (p.costResources || []).filter(resource => resource.materialId !== id));
    S.materials.splice(S.materials.findIndex(item => item.id === id), 1);
    log(`Material ${m.name} eliminado`);
    save();
    toast('Material eliminado del catálogo e inventario');
    render()
}

function monthlyFinancialReport(month) {
    const approvalDate = quotation => (quotation.history || [])
      .filter(event => ['Confirmada','Aprobada','Venta pagada','A crédito'].includes(event.status))
      .at(0)?.date || quotation.issue;
    const quotations = S.quotations
      .filter(quotation => isSale(quotation) && approvalDate(quotation).startsWith(month))
      .map(quotation => {
        const sales = quoteTotals(quotation).total
          , costs = quotationProductionCosts(quotation.items, S.products, S.materials, productionSettings());
        return {
            quotation,
            approvalDate: approvalDate(quotation),
            sales,
            direct: costs.materials
        }
    });
    const sales = quotations.reduce((total, row) => total + row.sales, 0)
      , direct = quotations.reduce((total, row) => total + row.direct, 0)
      , indirectRows = S.indirectCosts.filter(cost => fixedApplies(cost,month+'-31')).map(cost => ({
        ...cost,
        monthly: monthlyEquivalent(cost)
    })).concat((S.operatingExpenses || []).filter(e=>!e.voidedAt && e.date.startsWith(month)).map(e=>({concept:`Gasto del mes · ${e.concept}`,amount:expenseTotals(e.items).subtotal,frequency:'Del mes',monthly:expenseTotals(e.items).subtotal})))
      , indirect = indirectRows.reduce((total, cost) => total + cost.monthly, 0)
      , utility = sales - direct - indirect
      , margin = sales ? utility / sales * 100 : 0
      , quantityByProduct = new Map();
    quotations.forEach(({ quotation }) => quotation.items.forEach(item => {
        const current = quantityByProduct.get(item.productId) || 0;
        quantityByProduct.set(item.productId, current + (+item.qty || 0))
    }));
    const directRows = [...quantityByProduct].map(([productId, quantity]) => {
        const item = product(productId)
          , unitCost = productStandardCosts(item, S.materials, productionSettings()).directCostPerUnit;
        return {
            product: item,
            quantity,
            unitCost,
            total: unitCost * quantity
        }
    });
    const quotationRows = quotations.map(row => {
        const indirectAllocated = sales ? indirect * row.sales / sales : 0;
        return {
            ...row,
            indirect: indirectAllocated,
            utility: row.sales - row.direct - indirectAllocated
        }
    });
    const monthDate = new Date(`${month}-01T12:00:00Z`)
      , rawLabel = new Intl.DateTimeFormat('es-MX', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(monthDate)
      , label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    return {
        month,
        label,
        quotations: quotationRows,
        directRows,
        indirectRows,
        sales,
        collections: collectionReport(S.quotations, `${month}-01`, `${month}-31`),
        direct,
        indirect,
        utility,
        margin
    }
}

function collectionsReportBody(report) {
    return `<section style="margin-top:24px"><h2>Ventas, cobros y cuentas por cobrar</h2><p class="hint">Los abonos se filtran por su fecha de pago. Las cuentas por cobrar muestran el saldo actual de todas las ventas confirmadas, sin limitarlo al mes del reporte.</p><div class="metrics">${stat('banknote','COBRADO EN EL MES',money(report.collected),'Abonos vigentes con fecha','teal')}${stat('banknote','POR COBRAR ACTUAL',money(report.outstanding),'Ventas confirmadas','blue')}${stat('banknote','SALDO VENCIDO ACTUAL',money(report.overdue),'Según fecha límite de pago','orange')}</div>
    <h3>Cobros del mes</h3><div class="table-wrap"><table><thead><tr><th>Cotización / cliente</th><th>Fecha del abono</th><th>Importe</th><th>Referencia</th><th>Venta</th></tr></thead><tbody>${report.rows.map(r=>`<tr><td>${esc(r.quotation.folio)} · ${esc(quoteClient(r.quotation).name)}</td><td>${dateFmt(r.payment.date)}</td><td>${money(r.payment.amount)}</td><td>${esc(r.payment.reference)}</td><td>${esc(r.quotation.status)}</td></tr>`).join('') || '<tr><td colspan="5">Sin cobros en el mes.</td></tr>'}</tbody></table></div>
    <h3 style="margin-top:18px">Cuentas por cobrar actuales</h3><div class="table-wrap"><table><thead><tr><th>Cotización / cliente</th><th>Condición</th><th>Límite de pago</th><th>Pago</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>${report.receivables.map(r=>`<tr><td>${esc(r.quotation.folio)} · ${esc(quoteClient(r.quotation).name)}</td><td>${esc(r.terms)}</td><td>${r.due?dateFmt(r.due):'Sin fecha'}</td><td>${esc(r.status)}</td><td>${money(r.paid)}</td><td>${money(r.balance)}</td></tr>`).join('') || '<tr><td colspan="6">Sin saldos por cobrar.</td></tr>'}</tbody></table></div>
    <p class="hint">Los cobros no se suman otra vez a las ventas ni a la utilidad. Cobros del mes asociados a ventas canceladas: ${money(report.cancelledCollections)} (conservados, sin registrar devoluciones). Saldos pagados iniciales sin fecha conocida: ${money(report.opening)}; no se atribuyen a ningún mes.</p></section>`;
}
function monthlyFinancialReportBody(report) {
    const directTable = report.directRows.map(row => `<tr><td><strong>${esc(row.product.name)}</strong><small style="display:block">${esc(row.product.sku || '')}</small></td><td>${num(row.quantity)} ${esc(row.product.unit)}</td><td>${money(row.unitCost)}</td><td><b>${money(row.total)}</b></td></tr>`).join('') || '<tr><td colspan="4">No hay productos en ventas confirmadas durante el mes.</td></tr>'
      , indirectTable = report.indirectRows.map(cost => `<tr><td><strong>${esc(cost.concept)}</strong></td><td>${money(cost.amount)}</td><td>${esc(cost.frequency)}</td><td><b>${money(cost.monthly)}</b></td></tr>`).join('') || '<tr><td colspan="4">No hay costos indirectos activos.</td></tr>'
      , quotationTable = report.quotations.map(row => `<tr><td><strong>${esc(row.quotation.folio)}</strong></td><td>${dateFmt(row.approvalDate)}</td><td>${esc(quoteClient(row.quotation).name)}</td><td>${money(row.sales)}</td><td>${money(row.direct)}</td><td>${money(row.indirect)}</td><td><b class="${row.utility < 0 ? 'danger-text' : 'teal-text'}">${money(row.utility)} (${row.sales?(row.utility/row.sales*100).toFixed(2):'0.00'}%)</b></td></tr>`).join('') || '<tr><td colspan="7">No hay ventas confirmadas durante este mes.</td></tr>';
    return `<div class="metrics">${stat('banknote', 'VENTAS CON IVA', money(report.sales), `${report.quotations.length} ventas confirmadas`, 'blue')}${stat('package', 'COSTOS DIRECTOS', money(report.direct), 'Materiales de los productos vendidos', 'orange')}${stat('chart-no-axes-combined', 'COSTOS INDIRECTOS', money(report.indirect), 'Gastos activos calculados por mes', 'red')}${stat('arrow-up', 'UTILIDAD DEL MES (BASE CON IVA)', money(report.utility), `Margen ${num(report.margin)}%`, report.utility < 0 ? 'red' : 'teal')}</div><div class="grid two"><article class="panel"><div class="panel-head"><div><h3>Costos directos por producto</h3><p>Cantidad confirmada × costo directo actual de la fórmula.</p></div></div><div class="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>COSTO DIRECTO/U.</th><th>TOTAL</th></tr></thead><tbody>${directTable}</tbody></table></div></article><article class="panel"><div class="panel-head"><div><h3>Desglose de costos indirectos</h3><p>Importes semanales y diarios convertidos a equivalente mensual.</p></div></div><div class="table-wrap"><table><thead><tr><th>CONCEPTO</th><th>IMPORTE</th><th>PERIODICIDAD</th><th>MENSUAL</th></tr></thead><tbody>${indirectTable}</tbody></table></div></article></div><article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Utilidad por venta confirmada</h3><p>Los indirectos del mes se distribuyen proporcionalmente según la venta con IVA.</p></div></div><div class="table-wrap"><table><thead><tr><th>FOLIO</th><th>CONFIRMACIÓN</th><th>CLIENTE</th><th>VENTA CON IVA</th><th>DIRECTOS</th><th>INDIRECTOS</th><th>UTILIDAD</th></tr></thead><tbody>${quotationTable}</tbody></table></div></article><p class="hint" style="margin-top:12px">Utilidad mensual = ventas confirmadas con IVA − costos directos − costos indirectos activos del mes. Las cotizaciones canceladas no se incluyen. Indicador interno con IVA y costos vigentes; no representa utilidad contable neta.</p>${collectionsReportBody(report.collections)}`
}

function printMonthlyFinancialReport(month) {
    if (!can('reports.financial'))
        return toast('Solo un administrador puede generar este reporte');
    const report = monthlyFinancialReport(month)
      , reportWindow = window.open('', '_blank', 'width=1100,height=780');
    if (!reportWindow)
        return toast('Permite las ventanas emergentes para generar el reporte');
    const directRows = report.directRows.map(row => `<tr><td>${esc(row.product.name)}</td><td>${num(row.quantity)} ${esc(row.product.unit)}</td><td>${money(row.unitCost)}</td><td>${money(row.total)}</td></tr>`).join('') || '<tr><td colspan="4">Sin costos directos durante el mes.</td></tr>'
      , indirectRows = report.indirectRows.map(cost => `<tr><td>${esc(cost.concept)}</td><td>${money(cost.amount)}</td><td>${esc(cost.frequency)}</td><td>${money(cost.monthly)}</td></tr>`).join('') || '<tr><td colspan="4">Sin costos indirectos activos.</td></tr>'
      , quoteRows = report.quotations.map(row => `<tr><td>${esc(row.quotation.folio)}</td><td>${dateFmt(row.approvalDate)}</td><td>${esc(quoteClient(row.quotation).name)}</td><td>${money(row.sales)}</td><td>${money(row.direct)}</td><td>${money(row.indirect)}</td><td>${money(row.utility)} (${row.sales?(row.utility/row.sales*100).toFixed(2):'0.00'}%)</td></tr>`).join('') || '<tr><td colspan="7">Sin ventas confirmadas durante el mes.</td></tr>';
    reportWindow.opener=null;reportWindow.document.write(professionalReport(`<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>Reporte mensual · ${esc(report.label)}</title></head><body><header><div><img class="logo" src="assets/logo-gromex.png" alt="GROMEX"><div class="company">${esc(S.company.legal)}<br>${esc(S.company.rfc)} · ${esc(S.company.phone)}<br>${esc(S.company.email)}</div></div><div class="title"><h1>Reporte financiero mensual</h1><b>${esc(report.label)}</b><div>Generado: ${dateFmt(today())}</div></div></header><section class="metrics"><div class="metric"><small>VENTAS CON IVA</small><strong>${money(report.sales)}</strong></div><div class="metric"><small>COSTOS DIRECTOS</small><strong>${money(report.direct)}</strong></div><div class="metric"><small>COSTOS INDIRECTOS</small><strong>${money(report.indirect)}</strong></div><div class="metric utility"><small>UTILIDAD · MARGEN ${num(report.margin)}%</small><strong>${money(report.utility)}</strong></div></section><div class="grid"><section><h2>Costos directos por producto</h2><table><thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>COSTO/U.</th><th>TOTAL</th></tr></thead><tbody>${directRows}</tbody></table></section><section><h2>Costos indirectos mensuales</h2><table><thead><tr><th>CONCEPTO</th><th>IMPORTE</th><th>PERIODICIDAD</th><th>MENSUAL</th></tr></thead><tbody>${indirectRows}</tbody></table></section></div><h2>Utilidad por venta confirmada</h2><table><thead><tr><th>FOLIO</th><th>CONFIRMACIÓN</th><th>CLIENTE</th><th>VENTA CON IVA</th><th>DIRECTOS</th><th>INDIRECTOS</th><th>UTILIDAD</th></tr></thead><tbody>${quoteRows}</tbody></table><p class="note">Utilidad mensual = ventas confirmadas con IVA − costos directos − costos indirectos fijos y gastos variables del periodo, sin duplicar su absorción. Las cotizaciones canceladas no se incluyen. Indicador interno con IVA y costos vigentes; no representa utilidad contable neta.</p>${collectionsReportBody(report.collections)}</body></html>`,{company:S.company.name,landscape:true}));
    reportWindow.document.close()
}

function renderInventory() {
    setPage('Inventario', 'ALMACÉN Y MOVIMIENTOS');
    const own=user().warehouseId || 'alm-principal';
    const visible=S.warehouses.filter(w=>user().role==='Administrador' || (w.active && (user().canViewOtherWarehouses || w.id===own)));
    if (!visible.some(w=>w.id===inventoryWarehouseId)) inventoryWarehouseId=own;
    const readOnly=S.warehouses.find(w=>w.id===inventoryWarehouseId)?.active===false || (user().role!=='Administrador' && inventoryWarehouseId!==own);
    const localStock=(kind,id)=>(S.warehouseStocks || []).find(r=>(kind==='material' || r.warehouseId===inventoryWarehouseId) && r.kind===kind && r.itemId===id)?.qty || 0;
    const I={materials:S.materials.map(p=>({...p,stock:localStock('material',p.id)})),products:S.products.map(p=>({...p,stock:localStock('product',p.id)})),movements:S.movements.filter(m=>m.materialId || m.warehouseId===inventoryWarehouseId)};
    const warehouseToolbar=`<div class="warehouse-toolbar"><div class="field"><label>ALMACÉN CONSULTADO</label><select id="inventoryWarehouse">${visible.map(w=>`<option value="${esc(w.id)}" ${w.id===inventoryWarehouseId?'selected':''}>${esc(w.name)}${w.active===false?' (eliminado)':''}</option>`).join('')}</select></div><p class="hint">${readOnly?'Consulta de almacén: solo lectura.':'Los materiales son compartidos. Los blocks corresponden al almacén seleccionado.'}</p><button class="secondary" id="refreshInventory">Actualizar</button>${user().role==='Administrador'?'<button class="secondary" id="inventoryNewWarehouse">Administrar almacenes</button>':''}${roleAllowed('transfers')?'<button class="primary" id="openTransfers">Traspasos de inventario</button>':''}</div>`;
    const currentRole = user().role
      , canManageInventory = currentRole === 'Administrador'

      , movementButtons = key => [
          !readOnly && can('inventory.in') ? `<button class="btn btn-outline btn-sm" data-move-item="${key}" data-move-type="IN">Entrada</button>` : '',
          !readOnly && can('inventory.out') ? `<button class="btn btn-outline btn-sm" data-move-item="${key}" data-move-type="OUT">Salida</button>` : ''
        ].join('')
      , headerActions = (canManageInventory ? '<button class="btn btn-outline" id="newMaterial"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nuevo material</button>' : '') +
        (!readOnly && can('inventory.out') ? '<button class="secondary" id="newOut"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7" />  <path d="M12 19V5" /></svg> Registrar salida</button>' : '') +
        (!readOnly && can('inventory.in') ? '<button class="primary" id="newIn"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5v14" />  <path d="m19 12-7 7-7-7" /></svg> Registrar entrada</button>' : '')
      , low = [...I.materials,...I.products].filter(isLowStock)
      , materialValue = I.materials.reduce((sum, item) => sum + (+item.stock || 0) * (+item.price || 0), 0)
      , productValue = I.products.reduce((sum, item) => sum + (+item.stock || 0) * (+item.price || 0), 0)
      , inventoryValue = materialValue + productValue
      , materialCards = I.materials.map(m => {
        const pct = Math.min(100, m.stock / m.max * 100)
          , isLow = isLowStock(m)
          , displayUnit = inventoryUnit(m);
        const managementButtons = canManageInventory
          ? `<button class="btn btn-outline btn-sm" data-material-edit="${m.id}">Editar</button>${movementButtons(`material:${m.id}`)}<button class="btn btn-danger btn-sm" data-material-delete="${m.id}">Eliminar</button>`
          : movementButtons(`material:${m.id}`);
        return `<article class="material-card ${isLow?'stock-low-card':''}" data-stock-key="material:${esc(m.id)}" data-stock-low="${isLow}" tabindex="-1"><div class="material-top"><span class="stat-icon ${isLow ? 'red' : 'teal'}">${icon('package')}</span><div><h3>${esc(m.name)}</h3><p class="hint">${esc(m.code || 'Sin código')} · ${esc(m.supplier || 'Sin proveedor')}</p></div>${isLow ? '<span class="stock-tag">'+icon('triangle-alert')+(m.stock<=0?'Sin stock':'Existencia baja')+'</span>' : ''}</div><div class="amount">${num(toInventoryQuantity(m, m.stock))} <span>${esc(displayUnit)}</span></div><p class="hint">${money(inventoryUnitPrice(m))} por ${esc(displayUnit)}</p><div class="progress"><i class="${isLow ? 'red' : ''}" style="width:${Number.isFinite(pct) ? pct : 0}%"></i></div><footer><span>Mín. ${num(toInventoryQuantity(m, m.min))} ${esc(displayUnit)}</span><span>${Number.isFinite(pct) ? Math.round(pct) : 0}% capacidad</span></footer><div class="actions" style="margin-top:14px">${managementButtons}</div></article>`
    }).join('') || empty('warehouse', 'Sin materiales', 'Agrega el primer material al catálogo e inventario.')
      , productCards = I.products.map(p => {
        const displayUnit = inventoryUnit(p)
          , lastMovement = I.movements.find(movement => movement.productId === p.id);
        return `<article class="material-card product-stock-card ${isLowStock(p)?'stock-low-card':''}" data-stock-key="product:${esc(p.id)}" data-stock-low="${isLowStock(p)}" tabindex="-1"><div class="material-top"><span class="stat-icon blue"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />  <path d="M12 22V12" />  <polyline points="3.29 7 12 12 20.71 7" />  <path d="m7.5 4.27 9 5.15" /></svg></span><div><h3>${esc(p.name)}</h3><p class="hint">${esc(p.sku || 'Sin SKU')}</p></div>${isLowStock(p)?'<span class="stock-tag">'+icon('triangle-alert')+(p.stock<=0?'Sin stock':'Existencia baja')+'</span>':tag(p.active === false ? 'Inactivo' : 'Activo')}</div><div class="amount">${num(toInventoryQuantity(p, p.stock))} <span>${esc(displayUnit)}</span></div><p class="hint">Precio: ${money(inventoryUnitPrice(p))} por ${esc(displayUnit)}</p><div class="product-stock-value"><span>Valor a precio actual</span><b>${money((+p.stock || 0) * (+p.price || 0))}</b></div><footer><span>Mín. ${num(p.min || 0)} ${esc(displayUnit)} por almacén</span><span>${lastMovement ? `Último movimiento: ${dateFmt(lastMovement.date)}` : 'Sin movimientos'}</span></footer><div class="actions" style="margin-top:14px">${movementButtons(`product:${p.id}`)}${canManageInventory?`<button class="secondary" data-product-min="${esc(p.id)}">Configurar mínimo</button>`:''}</div></article>`
    }).join('') || empty('package', 'Sin productos o blocks', 'Registra productos para consultar su existencia en este apartado.');
    $('#content').innerHTML = sectionHead('Inventario y consumos', 'Consulta existencias y registra únicamente los movimientos autorizados para tu rol.', headerActions) + warehouseToolbar + `<div class="metrics">${stat('warehouse', 'MATERIALES', I.materials.length, 'Insumos registrados', 'blue')}${stat('package', 'PRODUCTOS / BLOCKS', I.products.length, `${num(I.products.reduce((sum, item) => sum + (+item.stock || 0), 0))} piezas disponibles`, 'teal')}${stat('triangle-alert', 'BAJO MÍNIMO', low.length, 'Materiales y productos por reponer', 'red')}${stat('banknote', 'VALOR DEL INVENTARIO', money(inventoryValue), 'Materiales y productos', 'orange')}</div><div class="stock-filter"><label><input type="checkbox" id="inventoryOnlyLow" ${inventoryOnlyLow?'checked':''}> Solo artículos con stock bajo o agotado</label><span class="hint" id="stockFilterCount"></span></div><section class="inventory-section"><div class="inventory-section-head"><div><h3>Inventario de materiales</h3><p>Inventario compartido por todos los almacenes, capturado en su presentación de compra.</p></div><b>${money(materialValue)}</b></div><div class="inventory-cards">${materialCards}</div></section><section class="inventory-section"><div class="inventory-section-head"><div><h3>Inventario de productos y blocks</h3><p>Producto terminado disponible para venta o entrega.</p></div><b>${money(productValue)}</b></div><div class="inventory-cards">${productCards}</div></section><article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Buscador de entradas y salidas</h3><p>Busca un material o producto por código o nombre y delimita el periodo.</p></div><button class="btn btn-outline btn-sm" id="exportMoves">Descargar Excel</button></div><div class="toolbar"><input class="search" id="inventorySearch" placeholder="Código, nombre, concepto, usuario o folio…"><div class="field"><label>DESDE</label><input type="date" id="moveFrom"></div><div class="field"><label>HASTA</label><input type="date" id="moveTo"></div><button class="btn btn-blue" id="searchMoves">Buscar</button><button class="secondary" id="clearMoves">Limpiar</button></div><div id="moveResults"></div></article>`;

    const filterCards=()=>{inventoryOnlyLow=$('#inventoryOnlyLow').checked;let shown=0;$$('[data-stock-key]').forEach(c=>{c.hidden=inventoryOnlyLow && c.dataset.stockLow!=='true';if(!c.hidden)shown++;});$('#stockFilterCount').textContent=shown+' artículos visibles';};
    $('#inventoryOnlyLow').onchange=filterCards;filterCards();
    $$('[data-product-min]').forEach(b=>b.onclick=()=>{
      const p=S.products.find(p=>p.id===b.dataset.productMin);
      openModal('Mínimo de inventario',esc(p.name),`<div class="field"><label>MÍNIMO POR ALMACÉN (PIEZAS)</label><input id="stockMinimum" type="number" min="0" step="1" value="${p.min || 0}"><small>Se compara con las existencias de cada almacén activo. Con mínimo 0 se alerta únicamente cuando no hay stock.</small></div>`,'<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveStockMinimum">Guardar mínimo</button>');
      $('#saveStockMinimum').onclick=async()=>{const n=Number($('#stockMinimum').value);if($('#stockMinimum').value==='' || !Number.isSafeInteger(n)||n<0)return toast('Captura un mínimo entero no negativo.');const previous=p.min;p.min=n;$('#saveStockMinimum').disabled=true;if(!await save()){p.min=previous;$('#saveStockMinimum').disabled=false;return;}closeModal();renderInventory();toast('Mínimo de inventario guardado');};
    });
    if(inventoryFocusKey){const key=inventoryFocusKey;inventoryFocusKey='';requestAnimationFrame(()=>{const card=$$('[data-stock-key]').find(c=>c.dataset.stockKey===key);if(card){card.classList.add('stock-focus');card.scrollIntoView({block:'center',behavior:'instant'});card.focus({preventScroll:true});}});}
    $('#inventoryWarehouse').onchange=()=>{inventoryWarehouseId=$('#inventoryWarehouse').value;renderInventory();};
    $('#refreshInventory').onclick=async()=>{try{Object.assign(S,await loadState());renderInventory();}catch(e){toast(e.message);}};
    if($('#openTransfers'))$('#openTransfers').onclick=()=>go('transfers');
    if($('#inventoryNewWarehouse'))$('#inventoryNewWarehouse').onclick=warehouseModal;
    const refresh = () => {
        const query = $('#inventorySearch').value
          , from = $('#moveFrom').value
          , to = $('#moveTo').value;
        if (from && to && from > to) {
            toast('La fecha inicial no puede ser posterior a la fecha final');
            return []
        }
        const rows = searchInventory({
            materials: I.materials,
            products: I.products,
            movements: I.movements,
            query,
            from,
            to
        });
        $('#moveResults').innerHTML = `<div class="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>NOMBRE</th><th>TIPO</th><th>COSTO / PRECIO</th><th>FECHA</th><th>CONCEPTO / MOTIVO</th><th>ENTRADAS</th><th>SALIDAS</th><th>EXISTENCIA ACTUAL</th><th>ACCIÓN</th></tr></thead><tbody>${rows.map(({ movement, item, kind, code }) => {
            const displayUnit = inventoryUnit(item)
              , movementQuantity = movement ? toInventoryQuantity(item, movement.qty) : 0;
            return `<tr><td><strong>${esc(code || '—')}</strong></td><td>${esc(item.name)}</td><td>${esc(kind)}</td><td>${money(inventoryUnitPrice(item))} / ${esc(displayUnit)}</td><td>${movement ? dateFmt(movement.date) : '—'}</td><td>${movement ? `<strong>${esc(movement.concept || 'Movimiento de inventario')}</strong>${movement.reference ? `<small class="movement-reference">Ref. ${esc(movement.reference)}</small>` : ''}` : '—'}</td><td><b class="teal-text">${movement?.type === 'IN' ? `${num(movementQuantity)} ${esc(displayUnit)}` : '—'}</b></td><td><b class="danger-text">${movement?.type === 'OUT' ? `${num(movementQuantity)} ${esc(displayUnit)}` : '—'}</b></td><td><b>${num(toInventoryQuantity(item, item.stock))} ${esc(displayUnit)}</b></td><td>${canManageInventory && movement && !/^(transfer|delivery):/.test(movement.id) ? `<button class="btn btn-danger btn-sm" data-movement-delete="${movement.id}">Eliminar</button>` : '—'}</td></tr>`
        }).join('') || '<tr><td colspan="10">No se encontraron materiales, productos o movimientos con esos criterios.</td></tr>'}</tbody></table></div>`;
        $$('[data-movement-delete]').forEach(b => b.onclick = () => deleteMovement(b.dataset.movementDelete));
        return rows
    }
    ;
    if ($('#newIn')) $('#newIn').onclick = () => movementModal('IN');
    if ($('#newOut')) $('#newOut').onclick = () => movementModal('OUT');
    if ($('#newMaterial')) $('#newMaterial').onclick = () => materialModal();
    $$('[data-material-edit]').forEach(b => b.onclick = () => materialModal(b.dataset.materialEdit));
    $$('[data-move-item]').forEach(b => b.onclick = () => movementModal(b.dataset.moveType || 'IN', b.dataset.moveItem));
    $$('[data-material-delete]').forEach(b => b.onclick = () => deleteMaterial(b.dataset.materialDelete));
    $('#searchMoves').onclick = refresh;
    $('#inventorySearch').oninput = refresh;
    $('#inventorySearch').onkeydown = event => {
        if (event.key === 'Enter') refresh()
    };
    $('#moveFrom').onchange = refresh;
    $('#moveTo').onchange = refresh;
    $('#clearMoves').onclick = () => {
        $('#inventorySearch').value = '';
        $('#moveFrom').value = '';
        $('#moveTo').value = '';
        refresh()
    }
    ;
    const downloadInventoryExcel=(name,rows)=>downloadCSV(name,rows,{scope:`Almacén: ${S.warehouses.find(w=>w.id===inventoryWarehouseId)?.name || inventoryWarehouseId}; búsqueda: ${$('#inventorySearch').value || 'Todas'}; desde: ${$('#moveFrom').value || 'Inicio'}; hasta: ${$('#moveTo').value || 'Hoy'}. Materiales compartidos; productos del almacén seleccionado.`});
    $('#exportMoves').onclick = () => {
        const rows = refresh();
        downloadInventoryExcel('inventario-gromex.csv', [['Código', 'Nombre', 'Tipo', 'Unidad de inventario', 'Costo / precio', 'Fecha', 'Concepto / motivo', 'Referencia', 'Entradas', 'Salidas', 'Existencia actual'], ...rows.map(({ movement, item, kind, code }) => [code || '', item.name, kind, inventoryUnit(item), inventoryUnitPrice(item), movement?.date || '', movement?.concept || '', movement?.reference || '', movement?.type === 'IN' ? toInventoryQuantity(item, movement.qty) : 0, movement?.type === 'OUT' ? toInventoryQuantity(item, movement.qty) : 0, toInventoryQuantity(item, item.stock)])])
    }
    ;

    refresh()
    focusSubmodule();
}
async function deleteMovement(id) {
    if (user().role !== 'Administrador') {
        toast('Tu rol no puede eliminar movimientos de inventario');
        return
    }
    const movementIndex = S.movements.findIndex(item => item.id === id)
      , movement = S.movements[movementIndex];
    if (!movement)
        return;
    if (movement.productId && S.valuation?.baseline?.includes(movement.id))
        return toast('Este movimiento forma parte del saldo inicial valorado. Registra un ajuste nuevo para corregir la existencia.');
    const productionOrder = S.orders.find(order => movement.concept?.includes(order.folio));
    if (productionOrder)
        return toast(`Este movimiento fue generado por la orden ${productionOrder.folio} y se conserva para no romper su historial.`);
    const item = movement.productId ? S.products.find(p => p.id === movement.productId) : S.materials.find(m => m.id === movement.materialId);
    if (!item)
        return toast('No se encontró el artículo relacionado');
    if (movement.type === 'IN' && item.stock < movement.qty)
        return toast(`No se puede eliminar esta entrada: la existencia de ${item.name} quedaría negativa.`);
    if (!window.confirm(`¿Eliminar este movimiento de ${num(toInventoryQuantity(item, movement.qty))} ${inventoryUnit(item)} de "${item.name}"? La existencia se ajustará automáticamente.`))
        return;
    const previousStock=item.stock;
    item.stock = Math.round((item.stock + (movement.type === 'IN' ? -movement.qty : movement.qty)) * 100000) / 100000;
    S.movements.splice(movementIndex, 1);
    log(`Movimiento ${movement.reference || movement.id} de ${item.name} eliminado`);
    if(!await save()){item.stock=previousStock;S.movements.splice(movementIndex,0,movement);return;}
    toast('Movimiento eliminado y existencia actualizada');
    render()
}
function movementModal(type='IN', selectedKey='') {
    if (!can(type === 'IN' ? 'inventory.in' : 'inventory.out')) {
        toast('Tu rol no tiene permiso para registrar este movimiento');
        return
    }
    const warehouseId = inventoryWarehouseId || user().warehouseId || 'alm-principal';
    if(user().role!=='Administrador' && warehouseId!==user().warehouseId) return toast('El otro almacén es de solo lectura');
    const items = inventoryItems(S.materials, S.products);
    if (!items.length) {
        toast('Primero registra un material o producto');
        go('inventory');
        return
    }
    openModal(type === 'IN' ? 'Registrar entrada' : 'Registrar salida', `${S.warehouses.find(w=>w.id===warehouseId)?.name || ''} · ${type==='IN'?'Aumentará':'Descontará'} materiales compartidos o blocks de este almacén.`, `<div class="form-grid"><div class="field full"><label>MATERIAL O PRODUCTO</label><select id="mvItem">${items.map(({ key, item, code, kind }) => `<option value="${key}" ${key === selectedKey ? 'selected' : ''}>${esc(code || 'Sin código')} · ${esc(item.name)} · ${kind} · ${num(toInventoryQuantity(item, (S.warehouseStocks || []).find(r=>(r.kind==='material' || r.warehouseId===warehouseId) && r.kind===(kind==='Producto'?'product':'material') && r.itemId===item.id)?.qty || 0))} ${esc(inventoryUnit(item))}</option>`).join('')}</select></div><div class="field"><label>FECHA</label><input type="date" id="mvDate" value="${today()}"></div><div class="field"><label>CANTIDAD EN UNIDAD DE INVENTARIO</label><input type="number" min=".001" step="any" id="mvQty"><small id="mvUnitHelp"></small></div><div class="field full"><label>CONCEPTO O MOTIVO</label><input id="mvConcept" placeholder="Compra a proveedor, venta, ajuste o producción…" required></div><div class="field full"><label>REFERENCIA</label><input id="mvReference" value="${nextFolio(type === 'IN' ? 'ENT' : 'SAL', S.movements.map( (x, i) => ({
        folio: x.reference || String(i)
    })))}"></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveMovement">Guardar movimiento</button>`);
    const updateMovementUnit = () => {
        const selected = items.find(option => option.key === $('#mvItem').value);
        const available = (S.warehouseStocks || []).find(r=>(r.kind==='material' || r.warehouseId===warehouseId) && r.kind===(selected.kind==='Producto'?'product':'material') && r.itemId===selected.item.id)?.qty || 0;
        $('#mvUnitHelp').textContent = `Disponible: ${num(toInventoryQuantity(selected.item,available))} ${inventoryUnit(selected.item)}`;
        if(type==='OUT') $('#mvQty').max=toInventoryQuantity(selected.item,available);
    };
    $('#mvItem').onchange = updateMovementUnit;
    updateMovementUnit();
    $('#saveMovement').onclick = async () => {
        const selected = items.find(option => option.key === $('#mvItem').value)
          , item = selected.item
          , displayQty = +$('#mvQty').value || 0
          , qty = fromInventoryQuantity(item, displayQty);
        if (displayQty <= 0)
            return toast('Ingresa una cantidad válida');
        const available=(S.warehouseStocks || []).find(r=>(r.kind==='material' || r.warehouseId===warehouseId) && r.kind===(selected.kind==='Producto'?'product':'material') && r.itemId===item.id)?.qty || 0;
        if (!Number.isFinite(qty) || (type === 'OUT' && qty > available)) return toast('Existencia insuficiente en este almacén');
        const concept = $('#mvConcept').value.trim();
        if (!concept)
            return toast('Escribe el concepto o motivo del movimiento');
        const previousStock=item.stock;
        item.stock = Math.round((item.stock + (type === 'IN' ? qty : -qty)) * 100000) / 100000;
        const movement = {
            id: uid(),
            warehouseId,
            date: $('#mvDate').value,
            type,
            qty,
            concept,
            reference: $('#mvReference').value
        };
        if (selected.kind === 'Producto')
            movement.productId = item.id;
        else
            movement.materialId = item.id;
        S.movements.unshift(movement);
        log(`${type === 'IN' ? 'Entrada' : 'Salida'} de ${item.name}`);
        $('#saveMovement').disabled=true;
        if(!await save()){item.stock=previousStock;S.movements=S.movements.filter(m=>m.id!==movement.id);$('#saveMovement').disabled=false;return;}
        closeModal();
        toast('Movimiento registrado');
        render()
    }
}

function renderProductionCosts() {
    setPage('Costos de producción', 'ANÁLISIS Y CONFIGURACIÓN');
    const settings = productionSettings()
      , standardCosts = productProductionCosts({ recipe: {} }, [], settings.standardDailyProduction, settings)
      , canEdit = can('costs')
      , orders = S.orders.slice().sort((a, b) => b.date.localeCompare(a.date));
    const orderRows = orders.map(order => {
        if(order.costSnapshot){const c=order.costSnapshot;return `<tr><td>${dateFmt(order.date)}</td><td><strong>${esc(order.folio)}</strong><small style="display:block">${esc(product(order.productId).name)} · Cierre registrado</small></td><td>${num(order.finalQty)} piezas</td><td>${money(c.direct)}</td><td>${money(c.indirect)}</td><td>${money(c.variable || 0)}</td><td>${money(c.bonus)}</td><td><b>${money(c.total)}</b><small>${moneyPrecise(c.total/order.finalQty)} / pieza</small></td></tr>`;}
        const p = product(order.productId)
          , dailyQuantity = productionQuantityForDate(order.date, orders)
          , costs = productProductionCosts(p, S.materials, dailyQuantity, {...settings,asOf:order.date,bonusQuantity:S.orders.filter(o=>o.date===order.date && o.productId===p.id && o.status!=='Cancelada').reduce((s,o)=>s+(o.status==='Terminada'?o.finalQty:o.qty),0)})
          , indirectAllocated = costs.indirectPerUnit * order.qty
          , bonusAllocated = costs.bonusPerUnit * order.qty;
        return `<tr><td>${dateFmt(order.date)}</td><td><strong>${esc(order.folio)}</strong><small style="display:block">${esc(p.name)}</small></td><td>${num(order.qty)} ${esc(p.unit)}</td><td>${money(costs.materialCost * order.qty)}</td><td>${money(indirectAllocated)}<small style="display:block">${num(dailyQuantity)} piezas totales del día</small></td><td>${money(costs.variablePerUnit * order.qty)}</td><td>${money(bonusAllocated)}</td><td><b>${money(costs.totalPerUnit * order.qty)}</b><small style="display:block">${money(costs.totalPerUnit)} / ${esc(p.unit)}</small></td></tr>`
    }).join('');
    $('#content').innerHTML = sectionHead('Costos de producción', 'Consulta cuánto cuesta fabricar cada pieza: materiales y gastos fijos de producción.') + `<div class="metrics">${stat('banknote', 'INDIRECTOS MENSUALES', '<span id="costMonthlyMetric">' + money(standardCosts.indirectMonthlyCost) + '</span>', 'Total calculado por mes', 'blue')}${stat('clock', 'INDIRECTOS DIARIOS', '<span id="costDailyMetric">' + money(standardCosts.indirectDailyCost) + '</span>', `${WORKING_DAYS_PER_MONTH} días laborables`, 'orange')}${stat('factory', 'META PREDETERMINADA', '<span id="costStandardMetric">' + num(standardCosts.standardDailyProduction) + '</span>', 'Blocks estimados', 'teal')}${stat('banknote', 'INDIRECTO POR BLOCK', '<span id="costUnitMetric">' + moneyPrecise(standardCosts.indirectPerUnit) + '</span>', 'Con la meta diaria', 'blue')}</div><article class="panel"><div class="panel-head"><div><h3>Parámetros generales</h3><p>${canEdit ? 'Los cambios se reflejan en productos, cotizaciones y órdenes.' : 'Solo un administrador puede modificar estos valores.'}</p></div></div><div class="form-grid"><div class="field"><label>META DIARIA SI EL PRODUCTO NO TIENE UNA</label><input type="number" min="1" step="1" id="costStandard" value="${settings.standardDailyProduction}" ${canEdit ? '' : 'disabled'}></div><div class="field"><label>BONO POR BLOCK EXCEDENTE</label><input type="number" min="0" step=".01" id="costBonusRate" value="${settings.bonusPerExtraBlock}" ${canEdit ? '' : 'disabled'}></div></div></article><article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Costos indirectos</h3><p>Luz y agua se editan aquí. Semanal × ${WORKING_WEEKS_PER_MONTH}; diario × ${WORKING_DAYS_PER_MONTH}; después todo se divide entre ${WORKING_DAYS_PER_MONTH} días laborables.</p></div>${canEdit ? '<button class="btn btn-outline btn-sm" id="addIndirectCost"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Agregar concepto</button>' : ''}</div><div class="table-wrap"><table><thead><tr><th>CONCEPTO</th><th>IMPORTE</th><th>PERIODICIDAD</th><th>EQUIVALENTE MENSUAL</th><th>PARTICIPACIÓN</th><th>ACTIVO</th><th></th></tr></thead><tbody id="indirectCostRows"></tbody></table></div>${canEdit ? '<button class="primary" id="saveProductionCosts" style="margin-top:14px">Guardar costos</button>' : ''}</article><article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Costos directos por producto</h3><p>El costo directo proviene del costo del material en Inventario y su cantidad en la fórmula.</p></div><div class="actions"><button class="btn btn-outline btn-sm" data-go="inventory">Administrar materiales</button><button class="btn btn-outline btn-sm" data-go="catalog">Editar fórmulas</button></div></div><div id="productCostAnalysis"></div></article><article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Costos por orden</h3><p>Los cierres muestran sus costos guardados; las órdenes abiertas muestran una estimación con materiales, fijos y bono.</p></div></div><div class="table-wrap"><table><thead><tr><th>FECHA</th><th>ORDEN</th><th>PRODUCCIÓN</th><th>DIRECTOS</th><th>FIJOS</th><th>VARIABLES</th><th>BONO</th><th>COSTO TOTAL</th></tr></thead><tbody>${orderRows || '<tr><td colspan="7">Sin órdenes de producción.</td></tr>'}</tbody></table></div></article>`;

    let draftCosts = structuredClone(settings.indirectCosts || []);
    const readRows = () => $$('[data-indirect-row]').map(row => ({
        id: row.dataset.indirectRow,
        concept: $('.cost-concept', row).value.trim(),
        amount: Math.max(0, +$('.cost-amount', row).value || 0),
        frequency: $('.cost-frequency', row).value,
        effectiveFrom: draftCosts.find(cost => cost.id === row.dataset.indirectRow)?.effectiveFrom || '',
        active: $('.cost-active', row).checked
    }));
    const preview = () => {
        const previewSettings = {
            ...productionSettings(),
            indirectCosts: readRows(),
            standardDailyProduction: Math.max(1, +$('#costStandard').value || 1),
            bonusPerExtraBlock: Math.max(0, +$('#costBonusRate').value || 0)
        };
        const previewCost = productProductionCosts({ recipe: {} }, [], previewSettings.standardDailyProduction, previewSettings);
        $('#costMonthlyMetric').textContent = money(previewCost.indirectMonthlyCost);
        $('#costDailyMetric').textContent = money(previewCost.indirectDailyCost);
        $('#costStandardMetric').textContent = num(previewCost.standardDailyProduction);
        $('#costUnitMetric').textContent = moneyPrecise(previewCost.indirectPerUnit);
        $$('[data-monthly]').forEach(cell => {
            const cost = previewSettings.indirectCosts.find(item => item.id === cell.dataset.monthly);
            cell.textContent = money(monthlyEquivalent(cost))
        });
        $$('[data-share]').forEach(cell => {
            const cost = previewSettings.indirectCosts.find(item => item.id === cell.dataset.share);
            const share = cost && fixedApplies(cost,businessToday()) && previewCost.indirectMonthlyCost ? monthlyEquivalent(cost) / previewCost.indirectMonthlyCost * 100 : 0;
            cell.textContent = `${share.toFixed(2)}%`
        });
        $('#productCostAnalysis').innerHTML = `<div class="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>PRECIO DE VENTA</th><th>DIRECTO / UNIDAD</th><th>FIJO / UNIDAD</th><th>BONO / UNIDAD</th><th>COSTO TOTAL</th><th>MARGEN ESTIMADO</th></tr></thead><tbody>${S.products.map(p => {
            const cost = productStandardCosts(p, S.materials, previewSettings);
            return `<tr><td><strong>${esc(p.name)}</strong><small style="display:block">${esc(p.sku)}</small></td><td>${money(p.price)}</td><td>${money(cost.directCostPerUnit)}</td><td>${moneyPrecise(cost.indirectPerUnit)}</td><td>${moneyPrecise(cost.bonusPerUnit)}</td><td><b>${money(cost.totalPerUnit)}</b></td><td class="${p.price - cost.totalPerUnit < 0 ? 'danger-text' : 'teal-text'}"><b>${money(p.price - cost.totalPerUnit)} (${profitPercent(p.price,cost.totalPerUnit)})</b></td></tr>`
        }).join('') || '<tr><td colspan="6">No hay productos registrados.</td></tr>'}</tbody></table></div>`
    };
    const drawRows = () => {
        $('#indirectCostRows').innerHTML = draftCosts.map(cost => `<tr data-indirect-row="${esc(cost.id)}"><td><input class="cost-concept" value="${esc(cost.concept)}" ${canEdit ? '' : 'disabled'}></td><td><input class="cost-amount" type="number" min="0" step=".01" value="${cost.amount}" ${canEdit ? '' : 'disabled'}></td><td><select class="cost-frequency" ${canEdit ? '' : 'disabled'}>${['Mensual', 'Semanal', 'Diario'].map(value => `<option ${value === cost.frequency ? 'selected' : ''}>${value}</option>`).join('')}</select></td><td><b data-monthly="${esc(cost.id)}"></b></td><td><b data-share="${esc(cost.id)}"></b></td><td><input class="cost-active" type="checkbox" ${cost.active !== false ? 'checked' : ''} ${canEdit ? '' : 'disabled'}></td><td>${canEdit ? `<button class="btn btn-danger btn-sm" data-cost-delete="${esc(cost.id)}" aria-label="Quitar"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18" />  <path d="m6 6 12 12" /></svg></button>` : ''}</td></tr>`).join('');
        $$('[data-indirect-row] input, [data-indirect-row] select').forEach(input => input.oninput = preview);
        $$('[data-cost-delete]').forEach(button => button.onclick = () => {
            if (readRows().length <= 1) return toast('Conserva al menos un concepto; puedes desactivarlo si no aplica');
            const usedBy = S.products.filter(product => (product.costResources || []).some(resource => resource.indirectCostId === button.dataset.costDelete));
            if (usedBy.length) return toast(`No se puede eliminar: está relacionado con ${usedBy.length} producto(s). Puedes desactivarlo.`);
            draftCosts = readRows().filter(cost => cost.id !== button.dataset.costDelete);
            drawRows()
        });
        preview()
    };
    $('#costStandard').oninput = preview;
    $('#costBonusRate').oninput = preview;
    if (canEdit) {
        $('#addIndirectCost').onclick = () => {
            draftCosts = readRows();
            draftCosts.push({ id: uid(), concept: '', amount: 0, frequency: 'Mensual', active: true });
            drawRows()
        };
        $('#saveProductionCosts').onclick = async () => {
            const standard = +$('#costStandard').value || 0
              , costs = readRows();
            if (standard <= 0) return toast('La meta diaria debe ser mayor que cero');
            if (costs.some(cost => !cost.concept)) return toast('Todos los costos indirectos necesitan un concepto');
            if (new Set(costs.map(cost => cost.concept.toLowerCase())).size !== costs.length) return toast('No repitas conceptos de costos indirectos');
            S.indirectCosts = costs;
            S.company.standardDailyProduction = standard;
            S.company.bonusPerExtraBlock = Math.max(0, +$('#costBonusRate').value || 0);
            log('Costos directos e indirectos actualizados');
            if (!await save()) return;
            toast('Costos de producción actualizados');
            renderProductionCosts()
        }
    }
    bindGo();
    drawRows();
    focusSubmodule();
}

function renderProduction() {
    setPage('Producción', 'PLANTA Y ÓRDENES');
    const active = S.orders.filter(o => o.status !== 'Terminada')
      , done = S.orders.filter(o => o.status === 'Terminada')
      , standardCosts = productProductionCosts({ recipe: {} }, [], productionSettings().standardDailyProduction, productionSettings());
    $('#content').innerHTML = sectionHead('Órdenes de producción', 'Programa las piezas que se fabricarán, registra los materiales utilizados y guarda el resultado del día.', (user().role==='Administrador'?'<button class="btn btn-outline" id="newWarehouse">Administrar almacenes</button>':'')+'<button class="primary" id="newOrder"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nueva orden</button>') + `<div class="metrics">${stat('factory', 'EN PROCESO', active.filter(o => o.status === 'En proceso').length, 'Con materiales entregados', 'orange')}${stat('clock', 'PLANIFICADAS', active.filter(o => o.status === 'Planificada').length, 'Sin materiales entregados', 'blue')}${stat('check', 'TERMINADAS', done.length, 'Histórico', 'teal')}${stat('layers', 'PIEZAS PRODUCIDAS', num(done.reduce( (s, o) => s + (+o.finalQty || 0), 0)), 'Producción real terminada', 'blue')}</div><article class="panel" style="margin-bottom:17px"><div class="panel-head"><div><h3>Parámetros actuales</h3><p>Se administran desde el módulo Costos de producción.</p></div><button class="btn btn-outline btn-sm" data-go="costs">Ver costos</button></div><div class="recipe"><div class="recipe-row"><span>Gastos fijos por mes</span><b>${money(standardCosts.indirectMonthlyCost)}</b></div><div class="recipe-row"><span>Días laborables estimados</span><b>${WORKING_DAYS_PER_MONTH} al mes</b></div><div class="recipe-row"><span>Indirectos diarios</span><b>${money(standardCosts.indirectDailyCost)}</b></div><div class="recipe-row"><span>Meta diaria</span><b>${num(standardCosts.standardDailyProduction)} blocks</b></div><div class="recipe-row"><span>Bono por block excedente</span><b>${money(standardCosts.bonusPerExtraBlock)}</b></div><div class="recipe-row"><span>Indirecto estándar por block</span><b>${moneyPrecise(standardCosts.indirectPerUnit)}</b></div></div></article><div id="orderList">${S.orders.slice().sort( (a, b) => b.date.localeCompare(a.date)).map(o => {
        const p = product(o.productId)
          , warehouse = S.warehouses.find(item => item.id === o.warehouseId)
          , issuedMaterials = (o.materials || []).filter(item => (+item.usedQty || 0) > 0);
        return `<article class="order"><div><small>${esc(o.folio)}${o.quoteId ? ' · ' + esc(S.quotations.find(q => q.id === o.quoteId)?.folio || '') : ''}</small><strong style="font-size:13px">${esc(p.name)}</strong><small>Destino: ${esc(o.warehouseName || warehouse?.name || 'Sin almacén')}</small></div><div><small>REQUERIDA / FINAL</small><strong>${num(o.qty)} / ${o.status === 'Terminada' ? num(o.finalQty) : '—'} ${esc(p.unit)}</strong><small>${dateFmt(o.date)}</small></div><div><small>MATERIALES UTILIZADOS</small><strong>${issuedMaterials.length} insumo(s)</strong><small>${o.consumed ? 'Existencias descontadas' : 'Pendientes de emitir'}</small></div><div><small>AVANCE · ${o.progress}%</small><div class="progress" style="margin-top:6px"><i class="${o.status === 'Terminada' ? '' : 'orange'}" style="width:${o.progress}%"></i></div><small>${tag(o.status)}</small></div><div class="order-actions"><button class="btn btn-outline btn-sm" data-order-materials="${esc(o.id)}">Materiales utilizados</button>${o.status !== 'Terminada' ? `<button class="btn btn-primary btn-sm" data-order-finish="${esc(o.id)}">Finalizar proceso</button>` : ''}<button class="btn btn-outline btn-sm" data-order-report="${esc(o.id)}">Reporte</button></div></article>`
    }
    ).join('') || empty('factory', 'Sin órdenes', 'Crea la primera orden de producción.')}</div>`;
    $('#newOrder').onclick = orderModal;
    if ($('#newWarehouse')) $('#newWarehouse').onclick = warehouseModal;
    bindGo();
    $$('[data-order-materials]').forEach(b => b.onclick = () => orderMaterialsModal(b.dataset.orderMaterials));
    $$('[data-order-finish]').forEach(b => b.onclick = () => finalizeOrderModal(b.dataset.orderFinish));
    $$('[data-order-report]').forEach(b => b.onclick = () => printProductionOrder(b.dataset.orderReport))
}

function warehouseModal() {
    if (user().role !== 'Administrador') return toast('Solo el administrador puede administrar almacenes');
    openModal('Administrar almacenes', 'Cambia nombres o elimina almacenes del uso diario conservando su historial.', `<div class="field"><label>NOMBRE DEL NUEVO ALMACÉN</label><input id="warehouseName" maxlength="120" placeholder="Ej. Almacén de producto terminado"></div><div class="recipe">${S.warehouses.map(item => `<div class="recipe-row"><input aria-label="Nombre del almacén" maxlength="120" data-warehouse-name="${esc(item.id)}" value="${esc(item.name)}"><span>${item.active===false?'Eliminado (histórico)':'Activo'}</span><button class="secondary" data-warehouse-rename="${esc(item.id)}">Cambiar nombre</button><button class="${item.active===false?'secondary':'btn btn-danger'}" data-warehouse-toggle="${esc(item.id)}">${item.active===false?'Restaurar':'Eliminar'}</button></div>`).join('')}</div><p class="hint">Antes de eliminar: traspasa los blocks, reasigna usuarios y resuelve solicitudes, producción y entregas pendientes. Los materiales compartidos no impiden eliminar un almacén.</p>`, '<button class="secondary" data-close>Cerrar</button><button class="primary" id="saveWarehouse">Agregar almacén</button>',true);
    const change=async(action)=>{
        const before=structuredClone(S.warehouses);
        action();
        if (!await save()) {S.warehouses=before;return;}
        render();warehouseModal();toast('Almacenes actualizados');
    };
    $('#saveWarehouse').onclick=()=>{
        const name=$('#warehouseName').value.trim();
        if (!name) return toast('Escribe el nombre del almacén');
        change(()=>S.warehouses.push({id:uid(),name,active:true}));
    };
    $$('[data-warehouse-rename]').forEach(button=>button.onclick=()=>{
        const id=button.dataset.warehouseRename;
        const input=$$('[data-warehouse-name]').find(input=>input.dataset.warehouseName===id);
        if (!input.value.trim()) return toast('Escribe el nombre del almacén');
        change(()=>S.warehouses.find(w=>w.id===id).name=input.value.trim());
    });
    $$('[data-warehouse-toggle]').forEach(button=>button.onclick=()=>{
        const warehouse=S.warehouses.find(w=>w.id===button.dataset.warehouseToggle);
        if (warehouse.active!==false && !window.confirm(`¿Eliminar ${warehouse.name} del uso diario? Su historial se conservará.`)) return;
        change(()=>warehouse.active=warehouse.active===false);
    });
}

function orderModal() {
    const activeProducts = S.products.filter(p => p.active)
      , activeWarehouses = S.warehouses.filter(item => item.active !== false && (user().role==='Administrador' || item.id===user().warehouseId));
    if (!activeProducts.length) {
        toast('Primero registra un producto activo');
        go('catalog');
        return
    }
    if (!activeWarehouses.length) {
        toast('Primero registra un almacén de destino');
        warehouseModal();
        return
    }
    const approved = S.quotations.filter(q => isSale(q));
    openModal('Nueva orden de producción', 'Define la cantidad requerida del día, la fecha, el producto y su almacén de destino.', `<div class="form-grid"><div class="field full"><label>COTIZACIÓN DE ORIGEN (OPCIONAL)</label><select id="oQuote"><option value="">Sin cotización</option>${approved.map(q => `<option value="${q.id}">${q.folio} · ${esc(quoteClient(q).name)}</option>`).join('')}</select></div><div class="field full"><label>PRODUCTO</label><select id="oProduct">${activeProducts.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>CANTIDAD REQUERIDA DEL DÍA</label><input type="number" min="1" id="oQty" value="${productDailyTarget(activeProducts[0],productionSettings())}"></div><div class="field"><label>FECHA DE PRODUCCIÓN</label><input type="date" id="oDate" value="${today()}"></div><div class="field full"><label>ALMACÉN DE DESTINO</label><select id="oWarehouse">${activeWarehouses.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></div></div><div class="grid two" style="margin-top:15px"><div class="panel"><h3 style="font-size:13px">Materiales planeados</h3><div class="explosion" id="orderReq"></div></div><div class="panel"><h3 style="font-size:13px">Costo estimado del día</h3><div class="recipe" id="orderCosts"></div></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveOrder">Generar orden</button>`, true);
    const req = () => {
        const p = product($('#oProduct').value)
          , qty = +$('#oQty').value || 0
          , date = $('#oDate').value
          , dailyQuantity = productionQuantityForDate(date) + qty;
        $('#orderReq').innerHTML = Object.entries(p.recipe || {}).map( ([mid,per]) => {
            const m = material(mid)
              , need = per * qty
              , ok = m.stock >= need
              , displayNeed = toInventoryQuantity(m, need)
              , displayStock = toInventoryQuantity(m, m.stock)
              , displayUnit = inventoryUnit(m)
              , converted = displayUnit !== m.unit;
            return `<div><small>${esc(m.name)}</small><strong class="${ok ? '' : 'danger-text'}">${num(displayNeed)} ${esc(displayUnit)}</strong><small>${converted ? `${num(need)} ${esc(m.unit)} de consumo · ` : ''}Disponible ${num(displayStock)} ${esc(displayUnit)}</small></div>`
        }
        ).join('');
        const costs = productProductionCosts(p, S.materials, dailyQuantity, {...productionSettings($('#oDate').value),bonusQuantity:qty+S.orders.filter(o=>o.date===$('#oDate').value && o.productId===p.id && o.status!=='Cancelada').reduce((s,o)=>s+(o.status==='Terminada'?o.finalQty:o.qty),0)})
          , allocatedIndirect = costs.indirectPerUnit * qty
          , allocatedBonus = costs.bonusPerUnit * qty;
        $('#orderCosts').innerHTML = qty > 0 ? `<div class="recipe-row"><span>Producción total programada ese día</span><b>${num(dailyQuantity)} piezas</b></div><div class="recipe-row"><span>Costos indirectos mensuales / diarios</span><b>${money(costs.indirectMonthlyCost)} / ${money(costs.indirectDailyCost)}</b></div><div class="recipe-row"><span>Indirecto fijo asignado a esta orden</span><b>${money(allocatedIndirect)}</b></div><div class="recipe-row"><span>Excedente diario sobre ${num(costs.standardDailyProduction)}</span><b>${num(costs.extraProduction)} ${esc(p.unit)}</b></div><div class="recipe-row"><span>Bono asignado a esta orden</span><b>${money(allocatedBonus)}</b></div><div class="recipe-row"><span>Costo directo por ${esc(p.unit)}</span><b>${money(costs.directCostPerUnit)}</b></div><div class="recipe-row"><span>Costo real estimado por ${esc(p.unit)}</span><b>${money(costs.totalPerUnit)}</b></div><div class="recipe-row"><span>Costo estimado de esta orden</span><b>${money(costs.totalPerUnit * qty)}</b></div>` : '<p class="hint danger-text">Captura una cantidad mayor que cero.</p>';
    }
    ;
    $('#oQuote').onchange = () => {
        const q = S.quotations.find(x => x.id === $('#oQuote').value);
        if (q && q.items[0]) {
            $('#oProduct').value = q.items[0].productId;
            $('#oQty').value = productDailyTarget(product(q.items[0].productId),productionSettings());
            req()
        }
    }
    ;
    $('#oProduct').onchange = () => { $('#oQty').value = productDailyTarget(product($('#oProduct').value),productionSettings()); req(); };
    $('#oQty').oninput = req;
    $('#oDate').onchange = req;
    req();
    $('#saveOrder').onclick = async () => {
        const qty = +$('#oQty').value || 0;
        if (qty <= 0)
            return toast('Ingresa una cantidad válida');
        if (!$('#oDate').value) return toast('Selecciona la fecha de producción');
        const selectedWarehouse = activeWarehouses.find(item => item.id === $('#oWarehouse').value);
        if (!selectedWarehouse) return toast('Selecciona un almacén de destino');
        const selectedProduct = product($('#oProduct').value);
        const o = {
            id: uid(),
            folio: nextFolio('OP', S.orders),
            quoteId: $('#oQuote').value,
            productId: selectedProduct.id,
            warehouseId: selectedWarehouse.id,
            warehouseName: selectedWarehouse.name,
            qty,
            finalQty: 0,
            date: $('#oDate').value,
            completedAt: '',
            status: 'Planificada',
            progress: 0,
            consumed: false,
            materials: Object.entries(selectedProduct.recipe || {}).map(([materialId, perUnit]) => ({
                materialId,
                plannedQty: (+perUnit || 0) * qty,
                usedQty: 0,
                perUnit: 0
            }))
        };
        S.orders.unshift(o);
        log(`Orden ${o.folio} programada`);
        if (!await save()) {
            S.orders = S.orders.filter(item => item.id !== o.id);
            return
        }
        closeModal();
        toast('Orden de producción generada');
        render()
    }
}

function orderMaterialsModal(id) {
    const order = S.orders.find(item => item.id === id)
      , p = product(order?.productId);
    if (!order) return toast('No se encontró la orden');
    const saved = new Map((order.materials || []).map(item => [item.materialId, item]))
      , rows = S.materials.map(item => {
        const detail = saved.get(item.id)
          , plannedQty = detail?.plannedQty ?? ((+p.recipe?.[item.id] || 0) * order.qty)
          , usedQty = order.consumed ? (+detail?.usedQty || 0) : plannedQty;
        return { item, plannedQty, usedQty }
    });
    const materialAvailable=m=>(S.warehouseStocks || []).find(r=>r.kind==='material' && r.itemId===m.id)?.qty || 0;
    openModal('Materiales utilizados', `${order.folio} · indica los materiales que se entregarán a producción.`, `<div class="toolbar"><input class="search" id="orderMaterialSearch" placeholder="Buscar material por código o nombre"></div><div style="overflow:auto"><table><thead><tr><th>Material</th><th>Planeado</th><th>Disponible</th><th>Cantidad a utilizar</th></tr></thead><tbody id="orderMaterialBody">${rows.map(row => `<tr data-material-row="${esc(row.item.id)}"><td><b>${esc(row.item.name)}</b><small style="display:block">${esc(row.item.code || '')}</small></td><td>${num(row.plannedQty)} ${esc(row.item.unit)}</td><td>${num(toInventoryQuantity(row.item, materialAvailable(row.item) + (order.consumed ? row.usedQty : 0)))} ${esc(inventoryUnit(row.item))}</td><td><input class="input" style="width:145px" type="number" min="0" step="any" data-material-qty="${esc(row.item.id)}" value="${row.usedQty}" ${order.status === 'Terminada' ? 'disabled' : ''}><small style="display:block">${esc(row.item.unit)} de fórmula</small></td></tr>`).join('')}</tbody></table></div><p class="hint">Las cantidades se capturan en la unidad de consumo de la fórmula. Al guardar, el sistema descuenta únicamente la diferencia respecto a una emisión anterior.</p>`, order.status === 'Terminada' ? '<button class="primary" data-close>Cerrar</button>' : '<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveOrderMaterials">Guardar y emitir materiales</button>', true);
    $('#orderMaterialSearch').oninput = event => {
        const query = event.target.value.trim().toLowerCase();
        $$('[data-material-row]').forEach(row => {
            const item = material(row.dataset.materialRow);
            row.style.display = `${item.code} ${item.name}`.toLowerCase().includes(query) ? '' : 'none'
        })
    };
    if (order.status === 'Terminada') return;
    $('#saveOrderMaterials').onclick = async () => {
        const quantities = new Map($$('[data-material-qty]').map(input => [input.dataset.materialQty, Math.max(0, +input.value || 0)]));
        const requested = rows.map(row => ({
            material: row.item,
            plannedQty: row.plannedQty,
            oldUsedQty: order.consumed ? row.usedQty : 0,
            usedQty: quantities.get(row.item.id) || 0
        }));
        if (!requested.some(item => item.usedQty > 0)) return toast('Captura al menos un material utilizado');
        const missing = requested.filter(item => item.usedQty > materialAvailable(item.material) + item.oldUsedQty + .000001);
        if (missing.length) return toast(`Existencia insuficiente: ${missing.map(item => item.material.name).join(', ')}`);
        const snapshot = {
            stocks: S.materials.map(item => [item.id, item.stock]),
            movements: structuredClone(S.movements),
            order: structuredClone(order)
        };
        requested.forEach(item => {
            const delta = item.usedQty - item.oldUsedQty
              , movementIndex = S.movements.findIndex(movement => movement.materialId === item.material.id && movement.concept === `Producción ${order.folio}`);
            item.material.stock = Math.round(((+item.material.stock || 0) - delta) * 1000000) / 1000000;
            if (item.usedQty <= 0 && movementIndex >= 0) S.movements.splice(movementIndex, 1);
            else if (item.usedQty > 0 && movementIndex >= 0) {
                S.movements[movementIndex].qty = item.usedQty;
                S.movements[movementIndex].date = order.date
            } else if (item.usedQty > 0) {
                S.movements.unshift({
                    id: uid(),
                    date: order.date,
                    materialId: item.material.id,
                    type: 'OUT',
                    qty: item.usedQty,
                    concept: `Producción ${order.folio}`,
                    reference: nextFolio('SAL', S.movements.map((movement, index) => ({ folio: movement.reference || String(index) })))
                })
            }
        });
        order.materials = requested.filter(item => item.plannedQty > 0 || item.usedQty > 0).map(item => ({
            materialId: item.material.id,
            plannedQty: item.plannedQty,
            usedQty: item.usedQty,
            perUnit: 0
        }));
        order.consumed = true;
        order.status = 'En proceso';
        order.progress = 50;
        log(`Materiales entregados para ${order.folio}`);
        if (!await save()) {
            snapshot.stocks.forEach(([materialId, stock]) => material(materialId).stock = stock);
            S.movements = snapshot.movements;
            Object.assign(order, snapshot.order);
            return
        }
        closeModal();
        toast('Materiales entregados y existencias actualizadas');
        renderProduction()
    }
}

function finalizeOrderModal(id) {
    const order = S.orders.find(item => item.id === id)
      , p = product(order?.productId);
    if (!order) return toast('No se encontró la orden');
    if (!order.consumed) return toast('Primero registra los materiales utilizados');
    if (order.status === 'Terminada') return toast('La orden ya está finalizada');
    const used = (order.materials || []).filter(item => (+item.usedQty || 0) > 0);
    openModal('Finalizar proceso', `${order.folio} · registra las piezas aceptadas al terminar la producción del día.`, `<div class="form-grid"><div class="field"><label>PIEZAS REQUERIDAS</label><input value="${order.qty}" disabled></div><div class="field"><label>PIEZAS FINALES PRODUCIDAS</label><input id="finalOrderQty" type="number" min="1" step="1" value="0"></div><div class="field full"><label>ALMACÉN DE DESTINO</label><input value="${esc(order.warehouseName || S.warehouses.find(item => item.id === order.warehouseId)?.name || '')}" disabled></div></div><div class="panel" style="margin-top:15px"><h3 style="font-size:13px">Consumo real por block</h3><div style="overflow:auto"><table><thead><tr><th>Material</th><th>Total utilizado</th><th>Por block terminado</th></tr></thead><tbody id="finalMaterialRows"></tbody></table></div></div>`, '<button class="secondary" data-close>Cancelar</button><button class="primary" id="finishOrder">Finalizar e ingresar al inventario</button>', true);
    const preview = () => {
        const finalQty = +$('#finalOrderQty').value || 0;
        $('#finalMaterialRows').innerHTML = used.map(item => {
            const m = material(item.materialId)
              , perUnit = finalQty > 0 ? item.usedQty / finalQty : 0;
            return `<tr><td><b>${esc(m.name)}</b></td><td>${num(item.usedQty)} ${esc(m.unit)}</td><td><b>${num(perUnit)} ${esc(m.unit)}</b></td></tr>`
        }).join('')
    };
    $('#finalOrderQty').oninput = preview;
    preview();
    $('#finishOrder').onclick = async () => {
        const finalQty = +$('#finalOrderQty').value || 0;
        if (finalQty <= 0) return toast('Ingresa la cantidad final producida');
        const snapshot = { stock: p.stock, movements: structuredClone(S.movements), order: structuredClone(order) };
        order.finalQty = finalQty;
        order.completedAt = today();
        order.materials = (order.materials || []).map(item => ({ ...item, perUnit: (+item.usedQty || 0) / finalQty }));
        order.status = 'Terminada';
        order.progress = 100;
        p.stock = Math.round(((+p.stock || 0) + finalQty) * 1000000) / 1000000;
        S.movements.unshift({
            id: uid(),
            date: order.date,
            productId: p.id,
            type: 'IN',
            qty: finalQty,
            concept: `Producción terminada ${order.folio} · ${order.warehouseName || 'Almacén'}`,
            reference: nextFolio('ENT', S.movements.map((movement, index) => ({ folio: movement.reference || String(index) })))
        });
        log(`${order.folio} finalizada con ${num(finalQty)} piezas`);
        if (!await save()) {
            p.stock = snapshot.stock;
            S.movements = snapshot.movements;
            Object.assign(order, snapshot.order);
            return
        }
        closeModal();
        toast('Proceso finalizado y producto ingresado al inventario');
        renderProduction()
    }
}

function printProductionOrder(id) {
    const order = S.orders.find(item => item.id === id);
    if (!order) return toast('No se encontró la orden');
    const indirectReport = orderIndirectCosts(order, S.orders, productionSettings(order.date));
    const indirectRows = indirectReport.rows.map(row => `<tr><td>${esc(row.concept)}</td><td>${money(row.daily)}</td><td>${money(row.planned)}</td><td>${indirectReport.finished ? money(row.used) : 'Pendiente'}</td><td>${moneyPrecise(row.plannedPerUnit)}</td><td>${indirectReport.finished ? moneyPrecise(row.usedPerUnit) : 'Pendiente'}</td></tr>`).join('');
    const p = product(order.productId)
      , reportQty = +order.finalQty || +order.qty || 1
      , details = (order.costSnapshot?.materials || order.materials || []).filter(item => (+item.plannedQty || 0) > 0 || (+item.usedQty || 0) > 0)
      , directTotal = details.reduce((sum, item) => sum + (+item.usedQty || 0) * (item.unitCost ?? (+material(item.materialId).price || 0)), 0)
      , plannedDirect = details.reduce((sum, item) => sum + (+item.plannedQty || 0) * (item.unitCost ?? (+material(item.materialId).price || 0)), 0)
      , directPerUnit = reportQty > 0 ? directTotal / reportQty : 0
      , reportWindow = window.open('', '_blank', 'width=1050,height=760');
    if (!reportWindow) return toast('Permite las ventanas emergentes para generar el reporte');
    const tableRows = details.map(item => {
        const m = {...material(item.materialId), price: item.unitCost ?? material(item.materialId).price}
          , perUnit = order.status === 'Terminada' ? (+item.perUnit || 0) : 0
          , amount = (+item.usedQty || 0) * (+m.price || 0);
        return `<tr><td>${esc(m.code || '')}</td><td>${esc(m.name)}</td><td>${num(item.plannedQty)} ${esc(m.unit)}</td><td>${order.consumed ? `${num(item.usedQty)} ${esc(m.unit)}` : 'Pendiente'}</td><td>${order.status === 'Terminada' ? `${num(perUnit)} ${esc(m.unit)}` : 'Pendiente'}</td><td>${money(m.price)}</td><td>${money(amount)}</td></tr>`
    }).join('');
    reportWindow.opener=null;reportWindow.document.write(professionalReport(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(order.folio)} · Orden de producción</title></head><body><header><div><h1>${esc(S.company.name || 'CC GROMEX')}</h1><div>Orden de producción</div></div><div><b>${esc(order.folio)}</b><br>${dateFmt(order.date)}</div></header><div class="meta"><div class="box"><small>Producto</small><b>${esc(p.name)}</b><br>${esc(p.sku || '')}</div><div class="box"><small>Almacén de destino</small><b>${esc(order.warehouseName || S.warehouses.find(item => item.id === order.warehouseId)?.name || 'Sin almacén')}</b></div><div class="box"><small>Estado</small><b>${esc(order.status)}</b></div><div class="box"><small>Cantidad requerida</small><b>${num(order.qty)} ${esc(p.unit)}</b></div><div class="box"><small>Piezas finales</small><b>${order.status === 'Terminada' ? `${num(order.finalQty)} ${esc(p.unit)}` : 'Pendiente'}</b></div><div class="box"><small>Fecha de finalización</small><b>${order.completedAt ? dateFmt(order.completedAt) : 'Pendiente'}</b></div></div><h2>Materiales de la orden</h2><table><thead><tr><th>Código</th><th>Material</th><th>Planeado</th><th>Utilizado</th><th>Uso por block</th><th>Costo unitario</th><th>Importe</th></tr></thead><tbody>${tableRows || '<tr><td colspan="7">Todavía no se han registrado materiales.</td></tr>'}</tbody></table><div class="totals"><div><span>Costo directo utilizado</span><b>${money(directTotal)}</b></div><div><span>Costo directo por pieza final</span><b>${order.status === 'Terminada' ? money(directPerUnit) : 'Pendiente'}</b></div></div><h2>Costos indirectos: planeado y utilizado</h2><p>Asignación de una jornada: importe mensual ÷ 24 días. Planeado: proporción de piezas requeridas entre todas las órdenes del día. Utilizado: proporción de piezas finales entre las órdenes terminadas del día. Al finalizar se conservan los precios de insumos y las bases de indirectos de la jornada; estos últimos son gastos asignados, no medidos por orden.${indirectReport.provisional ? ' Hay órdenes pendientes: la distribución utilizada es provisional.' : ''}</p><table><thead><tr><th>Concepto</th><th>Diario</th><th>Planeado</th><th>Utilizado</th><th>Planeado/pza</th><th>Utilizado/pza final</th></tr></thead><tbody>${indirectRows || '<tr><td colspan="6">Sin costos indirectos activos.</td></tr>'}</tbody></table><h2>Comparativo de costos</h2><table><thead><tr><th>Concepto</th><th>Planeado</th><th>Utilizado</th></tr></thead><tbody><tr><td>Directos</td><td>${money(plannedDirect)}</td><td>${order.consumed ? money(directTotal) : 'Pendiente'}</td></tr><tr><td>Indirectos</td><td>${money(indirectReport.planned)}</td><td>${indirectReport.finished ? money(indirectReport.used) : 'Pendiente'}</td></tr><tr><td>Total directos + fijos (sin variables ni bonos)</td><td>${money(plannedDirect + indirectReport.planned)}</td><td>${indirectReport.finished ? money(directTotal + indirectReport.used) : 'Pendiente'}</td></tr><tr><td>Directos + fijos por pieza (sin variables ni bonos)</td><td>${money((plannedDirect + indirectReport.planned) / (+order.qty || 1))}</td><td>${indirectReport.finished ? money((directTotal + indirectReport.used) / (+order.finalQty || 1)) : 'Pendiente'}</td></tr></tbody></table>${order.costSnapshot?`<h2>Gastos variables incorporados</h2><table><thead><tr><th>Gasto</th><th>Aplicar desde</th><th>Cuota por pieza</th><th>Importe en esta orden</th></tr></thead><tbody>${(order.costSnapshot.variableRows || []).map(v=>`<tr><td>${esc(v.concept)}</td><td>${esc(v.startDate)}</td><td>${moneyPrecise(v.rate)}</td><td>${money(v.amount)}</td></tr>`).join('') || '<tr><td colspan="4">Sin gastos variables aplicados.</td></tr>'}</tbody></table><div class="totals"><div><span>Directos + fijos</span><b>${money(order.costSnapshot.direct+order.costSnapshot.indirect)}</b></div><div><span>Variables</span><b>${money(order.costSnapshot.variable || 0)}</b></div><div><span>Bono</span><b>${money(order.costSnapshot.bonus)}</b></div><div class="grand"><span>Costo final registrado</span><b>${money(order.costSnapshot.total)}</b></div><div><span>Costo final por pieza</span><b>${moneyPrecise(order.costSnapshot.total/order.finalQty)}</b></div></div>`:''}<div class="signatures"><div class="signature">Responsable de producción</div><div class="signature">Responsable de almacén</div></div></body></html>`,{company:S.company.name,landscape:true}));
    reportWindow.document.close()
}

function renderReports() {
    setPage('Reportes', 'ANÁLISIS Y EXPORTACIÓN');
    const monthlyReportPanel = can('reports.financial') ? `<article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Reporte financiero mensual</h3><p>Desglosa ventas confirmadas, costos directos, costos indirectos y utilidad con IVA.</p></div><div class="actions"><button class="btn btn-outline btn-sm" id="monthlyReportCsv">Descargar Excel</button><button class="btn btn-blue btn-sm" id="monthlyReportPrint">Imprimir / PDF</button></div></div><div class="toolbar"><div class="field"><label>MES DEL REPORTE</label><input type="month" id="monthlyReportMonth" value="${today().slice(0, 7)}"></div><button class="secondary" id="monthlyReportRefresh">Actualizar reporte</button></div><div id="monthlyReportResults"></div></article>` : '';
    const from = reportFilters.from
      , to = reportFilters.to
      , qs = S.quotations.filter(q => (!from || q.issue >= from) && (!to || q.issue <= to))
      , moves = S.movements.filter(m => (!from || m.date >= from) && (!to || m.date <= to))
      , approved = qs.filter(q => isSale(q))
      , amount = approved.reduce( (s, q) => s + quoteTotals(q).total, 0)
      , proposals = qs.filter(q=>!q.folio?.startsWith('VEN-'))
      , conversion = proposals.length ? proposals.filter(isSale).length / proposals.length * 100 : 0
      , outs = moves.filter(m => m.type === 'OUT' && m.materialId)
      , byMat = {};
    outs.forEach(x => byMat[x.materialId] = (byMat[x.materialId] || 0) + toInventoryQuantity(material(x.materialId), x.qty));
    $('#content').innerHTML = sectionHead('Reportes', 'Indicadores por periodo y exportación para análisis externo.', '<button class="secondary" id="csvQuotes">Exportar cotizaciones y ventas</button><button class="secondary" id="csvMoves">Exportar movimientos</button>') + `<div class="toolbar"><div class="field"><label>DESDE</label><input type="date" id="rFrom" value="${from}"></div><div class="field"><label>HASTA</label><input type="date" id="rTo" value="${to}"></div><button class="btn btn-blue" id="applyReport">Aplicar periodo</button></div><div class="metrics">${stat('banknote', 'VENTAS CONFIRMADAS', money(amount), `${approved.length} ventas`, 'teal')}${stat('%', 'CONVERSIÓN', `${num(conversion)}%`, 'Cotizaciones concretadas / cotizadas', 'blue')}${stat('file-text', 'COTIZACIONES', proposals.length, 'En el periodo', 'orange')}${stat('arrow-left-right', 'MOVIMIENTOS', moves.length, 'Entradas y salidas', 'blue')}</div><div class="grid two"><article class="panel"><div class="panel-head"><div><h3>Cotizaciones por estado de venta</h3><p>Distribución del periodo</p></div></div>${QUOTE_STATUSES.map(st => {
        const n = proposals.filter(q => q.status === st).length;
        return `<div class="progress-row"><div class="progress-label"><span>${st}</span><b>${n}</b></div><div class="progress"><i style="width:${proposals.length ? n / proposals.length * 100 : 0}%;background:${st === 'Confirmada' ? 'var(--teal)' : st === 'Cancelada' ? 'var(--red)' : 'var(--blue)'}"></i></div></div>`
    }
    ).join('')}</article><article class="panel"><div class="panel-head"><div><h3>Consumo por material</h3><p>Salidas del inventario</p></div></div>${Object.entries(byMat).map( ([mid,q]) => `<div class="progress-row"><div class="progress-label"><span>${esc(material(mid).name)}</span><b>${num(q)} ${esc(inventoryUnit(material(mid)))}</b></div><div class="progress"><i class="orange" style="width:${Math.min(100, q / Math.max(...Object.values(byMat)) * 100)}%"></i></div></div>`).join('') || '<p class="hint">Sin consumos en el periodo.</p>'}</article></div>`;
    if (can('reports.financial')) {
        $('#content').insertAdjacentHTML('beforeend', `<article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Producción terminada y costo promedio mensual</h3><p>Costos finales por tipo de block, según el mes de finalización de las órdenes.</p></div><div class="actions"><button class="secondary" id="productionCostsCsv">Excel</button><button class="primary" id="productionCostsPrint">Imprimir / PDF</button></div></div><div class="toolbar"><div class="field"><label for="productionReportMonth">MES DE PRODUCCIÓN</label><input type="month" id="productionReportMonth" value="${productionReportMonth}"></div><button class="secondary" id="productionReportRefresh">Actualizar reporte</button></div><div id="productionCostResults">${productionCostReportBody()}</div></article>`);
        const refreshProductionReport = () => {
            const month = $('#productionReportMonth').value;
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { toast('Selecciona un mes válido.'); return false; }
            productionReportMonth = month;
            $('#productionCostResults').innerHTML = productionCostReportBody();
            return true;
        };
        $('#productionReportMonth').onchange = refreshProductionReport;
        $('#productionReportRefresh').onclick = refreshProductionReport;
        $('#productionCostsPrint').onclick = () => { if (refreshProductionReport()) printProductionCostReport(); };
        $('#productionCostsCsv').onclick = () => {
            if (!refreshProductionReport()) return;
            const report = selectedProductionReport();
            downloadCSV(`costos-produccion-mensual-${report.month}.csv`, [
                ['PRODUCCIÓN TERMINADA DEL MES', report.month],
                ['Criterio', 'Mes de finalización de las órdenes.'],
                ['Promedio por órdenes', 'Suma de los costos por pieza de cada orden / cantidad de órdenes del producto en el mes. Cada orden pesa lo mismo.'],
                ['Órdenes excluidas por cierre incompleto', report.missing],
                ['COSTO PROMEDIO MENSUAL POR TIPO DE BLOCK'],
                ['Producto','Código','Unidad','Órdenes','Piezas terminadas','Costo final total','Promedio por órdenes ($/pza)','Base'],
                ...report.rows.map(r=>[r.product.name,r.product.sku,r.product.unit,r.orders,r.pieces,r.total,r.averagePerOrder ?? '',productionCostBasis(r)]),
                [],['COSTOS POR ORDEN TERMINADA'],
                ['Orden','Fecha final','Producto','Piezas','Directos','Fijos','Cargos variables históricos','Bono','Total','Costo por pieza','Observación'],
                ...report.orders.map(o=>[o.folio,o.completedAt,product(o.productId).name,o.finalQty,o.costSnapshot.direct,o.costSnapshot.indirect,o.costSnapshot.variable || 0,o.costSnapshot.bonus,o.costSnapshot.total,o.costSnapshot.total / o.finalQty,productionCostBasis({orders:1,estimated:o.costSnapshot.estimated,provisional:o.costSnapshot.provisional})])
            ]);
        };
    }
    if (can('reports.audit')) {
        $('#content').insertAdjacentHTML('beforeend','<article class="panel" id="monthlyAuditPanel" style="margin-top:17px"></article>');
        mountMonthlyAudit($('#monthlyAuditPanel'),{downloadCSV,companyName:S.company.name});
    }
    $('#content').insertAdjacentHTML('beforeend', monthlyReportPanel);
    if (can('reports.financial')) {
        const refreshMonthlyReport = () => {
            const month = $('#monthlyReportMonth').value || today().slice(0, 7)
              , report = monthlyFinancialReport(month);
            $('#monthlyReportResults').innerHTML = monthlyFinancialReportBody(report);
            return report
        };
        $('#monthlyReportRefresh').onclick = refreshMonthlyReport;
        $('#monthlyReportMonth').onchange = refreshMonthlyReport;
        $('#monthlyReportPrint').onclick = () => printMonthlyFinancialReport($('#monthlyReportMonth').value || today().slice(0, 7));
        $('#monthlyReportCsv').onclick = () => {
            const report = refreshMonthlyReport();
            downloadCSV(`reporte-financiero-mensual-${report.month}.csv`, [
                ['Reporte mensual', report.label],
                ['Ventas confirmadas con IVA', report.sales],
                ['Cobros registrados en el mes', report.collections.collected],
                ['Cobros del mes de ventas canceladas', report.collections.cancelledCollections],
                ['Saldo actual por cobrar', report.collections.outstanding],
                ['Saldo actual vencido', report.collections.overdue],
                ['Costos directos', report.direct],
                ['Costos indirectos', report.indirect],
                ['Utilidad', report.utility],
                ['Margen (%)', report.margin],
                [],
                ['COSTOS DIRECTOS POR PRODUCTO'],
                ['Producto', 'Cantidad', 'Unidad', 'Costo directo unitario', 'Total'],
                ...report.directRows.map(row => [row.product.name, row.quantity, row.product.unit, row.unitCost, row.total]),
                [],
                ['COSTOS INDIRECTOS'],
                ['Concepto', 'Importe', 'Periodicidad', 'Equivalente mensual'],
                ...report.indirectRows.map(cost => [cost.concept, cost.amount, cost.frequency, cost.monthly]),
                [],
                ['UTILIDAD POR COTIZACIÓN'],
                ['Folio', 'Fecha de confirmación', 'Cliente', 'Venta con IVA', 'Directos', 'Indirectos', 'Utilidad'],
                ...report.quotations.map(row => [row.quotation.folio, row.approvalDate, quoteClient(row.quotation).name, row.sales, row.direct, row.indirect, row.utility]),
                [], ['COBROS DEL MES'], ['Cotización','Fecha del abono','Importe','Referencia','Estado de venta'],
                ...report.collections.rows.map(r=>[r.quotation.folio,r.payment.date,r.payment.amount,r.payment.reference,r.quotation.status]),
                [], ['CUENTAS POR COBRAR ACTUALES'], ['Cotización','Cliente','Condición','Fecha límite','Estado de pago','Pagado','Saldo'],
                ...report.collections.receivables.map(r=>[r.quotation.folio,quoteClient(r.quotation).name,r.terms,r.due,r.status,r.paid,r.balance])
            ])
        };
        refreshMonthlyReport()
    }
    $('#applyReport').onclick = () => {
        reportFilters = {
            from: $('#rFrom').value,
            to: $('#rTo').value
        };
        renderReports()
    }
    ;
    const exportFiltered=(name,rows)=>downloadCSV(name,rows,{scope:`Fecha de registro desde ${reportFilters.from || 'Inicio'} hasta ${reportFilters.to || 'Hoy'}`});
    $('#csvQuotes').onclick = () => exportFiltered('cotizaciones-gromex.csv', [['Folio', 'Fecha', 'Cliente', 'Estado de venta', 'Estado de pago', 'Condición', 'Fecha límite de pago', 'Pagado', 'Saldo', 'Subtotal', 'IVA', 'Total', 'Usuario'], ...qs.map(q => {
        const t = quoteTotals(q);
        const p=paymentSummary(q);
        return [q.folio, q.issue, quoteClient(q).name, q.status, p.status, p.terms, p.due, p.paid, p.balance, t.subtotal, t.tax, t.total, q.user]
    }
    )]);
    $('#csvMoves').onclick = () => exportFiltered('movimientos-gromex.csv', [['Fecha', 'Artículo', 'Código', 'Tipo de artículo', 'Movimiento', 'Cantidad', 'Unidad', 'Concepto', 'Referencia'], ...moves.map(x => {
        const item = x.productId ? product(x.productId) : material(x.materialId);
        return [x.date, item.name, x.productId ? item.sku : item.code, x.productId ? 'Producto' : 'Material', x.type, toInventoryQuantity(item, x.qty), inventoryUnit(item), x.concept, x.reference]
    })])
    focusSubmodule();
}
// Nombre conservado para los módulos anteriores; el archivo descargado ahora es XLSX real.
function downloadCSV(filename, rows, context={}) {
    return downloadExcelReport(filename,rows,{company:S.company.name,...context}).then(
        ()=>toast('Archivo Excel exportado'),
        error=>toast(error.message || 'No se pudo generar el archivo Excel.')
    );
}

function selectedProductionReport() {
    return monthlyProductionReport(S.products, S.orders, productionReportMonth);
}
function productionCostReportBody() {
    const report = selectedProductionReport();
    return `<p class="hint">Mes de finalización: <b>${esc(report.month)}</b>. Este apartado usa su propio selector mensual.</p>
    <div class="metrics">${stat('layers','PIEZAS TERMINADAS',num(report.pieces),'En el mes seleccionado','blue')}${stat('banknote','COSTO FINAL DE PRODUCCIÓN',money(report.total),'Materiales + fijos + bono; conserva cargos históricos','orange')}${stat('file-text','ÓRDENES TERMINADAS',report.orders.length,'Con costo de cierre disponible','teal')}${stat('package','TIPOS DE BLOCK PRODUCIDOS',report.rows.filter(r=>r.orders).length,'Con producción en este mes','blue')}</div>
    <h3>Costo promedio mensual por tipo de block</h3><p class="hint"><b>Promedio por órdenes:</b> suma de los costos unitarios de las órdenes ÷ cantidad de órdenes; cada orden tiene el mismo peso para comparar el desempeño.</p><p class="hint">Se expresa en $/pieza e incluye materiales utilizados, indirectos fijos y bono de las mismas órdenes terminadas. Los cargos variables de órdenes históricas se conservan únicamente como referencia anterior. Se calcula con valores sin redondear y se muestra con hasta cuatro decimales. Las entradas manuales y las salidas de inventario no intervienen.</p>
    ${report.missing ? `<p class="danger-text">${report.missing} orden(es) terminada(s) sin datos de cierre completos: excluidas del cálculo.</p>` : ''}
    <div class="table-wrap"><table><thead><tr><th>Producto / código</th><th>Órdenes</th><th>Piezas terminadas</th><th>Costo final total</th><th>Promedio por órdenes ($/pza)</th><th>Base</th></tr></thead><tbody>${report.rows.map(r=>`<tr><td>${esc(r.product.name)}<br>${esc(r.product.sku)}</td><td>${r.orders}</td><td>${num(r.pieces)} ${esc(r.product.unit)}</td><td>${money(r.total)}</td><td>${r.averagePerOrder === null ? '—' : moneyPrecise(r.averagePerOrder)}</td><td>${esc(productionCostBasis(r))}</td></tr>`).join('') || '<tr><td colspan="6">No hay productos registrados.</td></tr>'}</tbody></table></div>
    <h3 style="margin-top:20px">Costos por orden terminada</h3><div class="table-wrap"><table><thead><tr><th>Orden / producto</th><th>Finalizada</th><th>Piezas</th><th>Directos</th><th>Fijos</th><th>Variables históricos</th><th>Bono</th><th>Total</th><th>Costo/pza</th></tr></thead><tbody>${report.orders.map(o=>{const c=o.costSnapshot;return `<tr><td><b>${esc(o.folio)}</b><br>${esc(product(o.productId).name)}${c.estimated?'<br>Cierre histórico estimado':''}${c.provisional?'<br>Reparto provisional':''}</td><td>${dateFmt(o.completedAt)}</td><td>${num(o.finalQty)}</td><td>${money(c.direct)}</td><td>${money(c.indirect)}</td><td>${money(c.variable || 0)}</td><td>${money(c.bonus)}</td><td>${money(c.total)}</td><td>${moneyPrecise(c.total / o.finalQty)}</td></tr>`;}).join('') || '<tr><td colspan="8">Sin órdenes terminadas con costo disponible en este mes.</td></tr>'}</tbody></table></div>
    <p class="hint">Se utilizan los costos guardados al cerrar cada orden. Los cierres históricos estimados se identifican en la tabla. Un reparto provisional puede ajustarse al finalizar otras órdenes de la misma jornada.</p>`;
}
function printProductionCostReport() {
    if (!can('reports.financial')) return;
    const reportWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!reportWindow) return toast('Permite las ventanas emergentes para imprimir');
    reportWindow.opener=null;reportWindow.document.write(professionalReport(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Costos de producción mensual ${esc(productionReportMonth)}</title></head><body><h1>${esc(S.company.name)} · Costo promedio mensual por tipo de block</h1>${productionCostReportBody()}</body></html>`,{company:S.company.name,landscape:true}));
    reportWindow.document.close();
}

function renderAdmin() {
    setPage('Administración', 'USUARIOS Y CONFIGURACIÓN');
    $('#content').innerHTML = sectionHead('Administración', 'Empresa, usuarios, actividad y respaldo de información.', '<button class="secondary" id="backupBtn">Descargar respaldo</button><button class="primary" id="newUser"><svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14" />  <path d="M12 5v14" /></svg> Nuevo usuario</button>') + `<div class="grid two"><article class="panel"><div class="panel-head"><div><h3>Datos de la empresa</h3><p>Aparecen en las cotizaciones impresas.</p></div></div><div class="form-grid"><div class="field"><label>NOMBRE COMERCIAL</label><input id="coName" value="${esc(S.company.name)}"></div><div class="field"><label>RAZÓN SOCIAL</label><input id="coLegal" value="${esc(S.company.legal)}"></div><div class="field"><label>RFC</label><input id="coRfc" value="${esc(S.company.rfc)}"></div><div class="field"><label>TELÉFONO</label><input id="coPhone" value="${esc(S.company.phone)}"></div><div class="field"><label>CORREO</label><input id="coEmail" value="${esc(S.company.email)}"></div><div class="field"><label>IVA PREDETERMINADO (%)</label><input type="number" id="coTax" value="${S.company.tax}"></div><div class="field"><label>VIGENCIA DE COTIZACIÓN (DÍAS)</label><input type="number" min="1" id="coValidity" value="${S.company.validity}"></div><div class="field full"><label>DIRECCIÓN</label><input id="coAddress" value="${esc(S.company.address)}"></div></div><button class="primary" id="saveCompany" style="margin-top:14px">Guardar configuración</button></article><article class="panel"><div class="panel-head"><div><h3>Actividad reciente</h3><p>Acciones realizadas en el sistema.</p></div></div>${S.activity.slice(0, 8).map(a => `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><b style="font-size:10px">${esc(a.text)}</b><p class="hint">${dateFmt(a.date)} · ${esc(a.user)}</p></div>`).join('') || '<p class="hint">La actividad aparecerá aquí.</p>'}</article></div><article class="panel" style="margin-top:15px"><div class="panel-head"><div><h3>Usuarios y roles</h3><p>El acceso utiliza nombre de usuario y contraseña; el correo se conserva como dato de contacto.</p></div></div><div class="table-wrap"><table><thead><tr><th>NOMBRE</th><th>USUARIO</th><th>CORREO</th><th>ROL</th><th>ALMACÉN</th><th>VER OTROS</th><th>ESTADO</TH><th></th></tr></thead><tbody>${S.users.map(u => `<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.username)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(S.warehouses.find(w=>w.id===u.warehouseId)?.name || "Sin asignar")}</td><td>${u.canViewOtherWarehouses ? "Sí" : "No"}</td><td>${tag(u.active ? 'Activo' : 'Inactivo')}</td><td><button class="btn btn-outline btn-sm" data-user-edit="${u.id}">Editar</button></td></tr>`).join('')}</tbody></table></div></article>`;
    const permissionDraft = normalizePermissions(S.rolePermissions);
    $('#content').insertAdjacentHTML('beforeend', `<article class="panel" style="margin-top:17px"><div class="panel-head"><div><h3>Permisos por rol</h3><p>Activa módulos y operaciones para todos los usuarios de cada rol. Los cambios se aplican al guardar.</p></div><button class="primary" id="saveRolePermissions">Guardar permisos</button></div><p class="hint">Productos, fórmulas, precios, usuarios y edición de ventas confirmadas son exclusivos del administrador. Administración conserva siempre el acceso. Para entradas/salidas se requiere Inventario; para costos y utilidad, Reportes.</p><div class="table-wrap"><table><thead><tr><th>Permiso</th>${ROLES.map(role=>`<th>${esc(role)}</th>`).join('')}</tr></thead><tbody>${PERMISSIONS.map(([key,label])=>`<tr><td>${esc(label)}</td>${ROLES.map(role=>`<td><label class="permission-switch"><input type="checkbox" role="switch" aria-label="${esc(label)}: ${esc(role)}" data-role-permission="${esc(key)}" data-permission-role="${esc(role)}" ${permissionDraft[role][key]?'checked':''} ${role==='Administrador'?'disabled':''}><span aria-hidden="true"></span></label></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="hint">Una sesión abierta debe recargar la página para actualizar sus botones; el servidor comprueba los permisos guardados en cada operación.</p></article>`);
    $('#saveRolePermissions').onclick = async () => {
        const previous = structuredClone(S.rolePermissions);
        $$('[data-role-permission]').forEach(input => permissionDraft[input.dataset.permissionRole][input.dataset.rolePermission] = input.checked);
        S.rolePermissions = permissionDraft;
        $('#saveRolePermissions').disabled = true;
        if (!await save()) { S.rolePermissions = previous; $('#saveRolePermissions').disabled = false; return; }
        toast('Permisos guardados'); renderAdmin();
    };
    $('#newUser').onclick = () => userModal();
    $('#coTax').value = FIXED_TAX_RATE;
    $('#coTax').disabled = true;
    const taxLabel = $('label', $('#coTax').closest('.field'));
    if (taxLabel)
        taxLabel.textContent = 'IVA FIJO (%)';
    $$('[data-user-edit]').forEach(b => b.onclick = () => userModal(b.dataset.userEdit));
    $('#saveCompany').onclick = () => {
        Object.assign(S.company, {
            name: $('#coName').value,
            legal: $('#coLegal').value,
            rfc: $('#coRfc').value,
            phone: $('#coPhone').value,
            email: $('#coEmail').value,
            tax: FIXED_TAX_RATE,
            validity: +$('#coValidity').value || 15,
            address: $('#coAddress').value
        });
        log('Configuración de empresa actualizada');
        save();
        toast('Configuración guardada')
    }
    ;
    $('#backupBtn').onclick = backup
    focusSubmodule();
}
function userModal(id) {
    const old = id ? S.users.find(u => u.id === id) : null
      , u = old ? structuredClone(old) : {
        id: uid(),
        name: '',
        username: '',
        email: '',
        role: S.users.length ? 'Almacén' : 'Administrador',
        active: true
    };
    openModal(old ? 'Editar usuario' : 'Nuevo usuario', 'El acceso utiliza nombre de usuario y contraseña; el correo seguirá registrado como contacto.', `<div class="form-grid"><div class="field full"><label>NOMBRE COMPLETO</label><input id="uName" value="${esc(u.name)}"></div><div class="field"><label>NOMBRE DE USUARIO</label><input id="uUsername" value="${esc(u.username)}" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="40"><small>De 3 a 40 caracteres: letras, números, punto, guion o guion bajo.</small></div><div class="field"><label>CORREO</label><input type="email" id="uEmail" value="${esc(u.email)}" autocomplete="email"></div><div class="field full"><label>${old ? 'NUEVA CONTRASEÑA (DEJAR VACÍA PARA CONSERVARLA)' : 'CONTRASEÑA'}</label><input type="password" id="uPassword" minlength="8" autocomplete="new-password"></div><div class="field"><label>ROL</label><select id="uRole">${['Administrador', 'Producción', 'Almacén', 'Ventas'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div class="field"><label>ALMACÉN ASIGNADO</label><select id="uWarehouse">${S.warehouses.filter(w=>w.active).map(w=>`<option value="${esc(w.id)}" ${w.id===(u.warehouseId || 'alm-principal')?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div><div class="field full"><label><input type="checkbox" id="uOtherWarehouses" ${u.canViewOtherWarehouses?'checked':''}> Permitir consultar existencias de otros almacenes (solo lectura)</label></div><div class="field"><label>ESTADO</label><select id="uActive"><option value="1" ${u.active ? 'selected' : ''}>Activo</option><option value="0" ${!u.active ? 'selected' : ''}>Inactivo</option></select></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="saveUser">Guardar usuario</button>`);
    $('#saveUser').onclick = async () => {
        u.name = $('#uName').value.trim();
        if (!u.name)
            return toast('Escribe el nombre');
        u.username = $('#uUsername').value.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,40}$/.test(u.username))
            return toast('Escribe un nombre de usuario válido de 3 a 40 caracteres');
        u.email = $('#uEmail').value.trim().toLowerCase();
        const password = $('#uPassword').value;
        if (!u.email)
            return toast('Escribe el correo del usuario');
        if ((!old || password) && password.length < 8)
            return toast('La contraseña debe tener al menos 8 caracteres');
        if (S.users.some(item => item.id !== u.id && item.email.trim().toLowerCase() === u.email))
            return toast('Ya existe un usuario con ese correo');
        if (S.users.some(item => item.id !== u.id && String(item.username || '').trim().toLowerCase() === u.username))
            return toast('Ya existe un usuario con ese nombre de usuario');
        if (password)
            u.password = password;
        u.warehouseId = $('#uWarehouse').value;
        u.canViewOtherWarehouses = $('#uOtherWarehouses').checked;
        if (!u.warehouseId) return toast('Asigna un almacén al usuario');
        u.role = $('#uRole').value;
        u.active = $('#uActive').value === '1';
        const otherAdministrator = S.users.some(item => item.id !== u.id && item.active && item.role === 'Administrador');
        if (old && (!u.active || u.role !== 'Administrador') && !otherAdministrator)
            return toast('Debe existir al menos un administrador activo');
        const oldSnapshot = old ? structuredClone(old) : null;
        const activitySnapshot = structuredClone(S.activity);
        if (old)
            Object.assign(old, u);
        else {
            S.users.push(u);
            if (!S.sessionId)
                S.sessionId = u.id
        }
        log(`Usuario ${u.name} guardado`);
        $('#saveUser').disabled = true;
        $('#saveUser').textContent = 'Guardando…';
        const saved = await save();
        delete u.password;
        if (!saved) {
            if (old)
                Object.assign(old, oldSnapshot);
            else
                S.users = S.users.filter(item => item.id !== u.id);
            S.activity = activitySnapshot;
            $('#saveUser').disabled = false;
            $('#saveUser').textContent = 'Guardar usuario';
            return
        }
        closeModal();
        toast('Usuario guardado');
        render()
    }
}
function backup() {
    const blob = new Blob([JSON.stringify(S, null, 2)],{
        type: 'application/json'
    })
      , url = URL.createObjectURL(blob)
      , a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-gromex-${today()}.json`;
    a.click();
    setTimeout( () => URL.revokeObjectURL(url), 500);
    toast('Respaldo descargado')
}
function switchUser() {
    const current = user();
    openModal('Cuenta', 'Sesión iniciada en esta computadora.', `<div class="panel" style="box-shadow:none"><div style="display:flex;align-items:center;gap:12px"><span class="avatar">${current.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}</span><span><b>${esc(current.name)}</b><small style="display:block">@${esc(current.username)} · ${esc(current.email)} · ${esc(current.role)}</small></span></div></div>`, `<button class="secondary" data-close>Cancelar</button><button class="primary" id="logoutBtn">Cerrar sesión</button>`);
    $('#logoutBtn').onclick = async () => {
        $('#logoutBtn').disabled = true;
        $('#logoutBtn').textContent = 'Cerrando…';
        try {
            await logout()
        } catch (error) {
            $('#logoutBtn').disabled = false;
            $('#logoutBtn').textContent = 'Cerrar sesión';
            toast(error.message || 'No se pudo cerrar la sesión')
        }
    }
}
function bindGo() {
    $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
    bindQuoteActions()
}
function globalSearch(e) {
    const q = e.target.value.trim().toLowerCase();
    $('.search-results')?.remove();
    if (q.length < 2)
        return;
    const quotationResults = (roleAllowed('quotes') || roleAllowed('quotations')) ? S.quotations.filter(x => roleAllowed(quotationWasConfirmed(x)?'quotes':'quotations') && (x.folio + quoteClient(x).name).toLowerCase().includes(q)).slice(0, 4).map(x => ({
        title: x.folio,
        sub: `${quotationWasConfirmed(x)?'Venta':'Cotización'} · ${quoteClient(x).name}`,
        view: 'quote',
        id: x.id
    })) : []
      , clientResults = roleAllowed('clients') ? S.clients.filter(x => (x.name + x.company).toLowerCase().includes(q)).slice(0, 3).map(x => ({
        title: x.name,
        sub: 'Cliente',
        view: 'client',
        id: x.id
    })) : []
      , supplierResults = roleAllowed('suppliers') ? S.suppliers.filter(x => (x.name + x.contact + x.category).toLowerCase().includes(q)).slice(0, 3).map(x => ({
        title: x.name,
        sub: 'Proveedor · ' + x.category,
        view: 'supplier',
        id: x.id
    })) : []
      , inventoryResults = roleAllowed('inventory') ? S.materials.filter(x => x.name.toLowerCase().includes(q)).slice(0, 3).map(x => ({
        title: x.name,
        sub: 'Material',
        view: 'inventory'
    })) : []
      , results = [...quotationResults, ...clientResults, ...supplierResults, ...inventoryResults];
    const d = document.createElement('div');
    d.className = 'search-results';
    d.innerHTML = results.map( (r, i) => `<button class="search-result" data-result="${i}"><strong>${esc(r.title)}</strong><small>${esc(r.sub)}</small></button>`).join('') || '<p class="hint" style="padding:10px">Sin resultados</p>';
    document.body.appendChild(d);
    $$('[data-result]', d).forEach(b => b.onclick = () => {
        const r = results[+b.dataset.result];
        d.remove();
        e.target.value = '';
        if (r.view === 'quote')
            viewQuote(r.id);
        else if (r.view === 'client')
            clientDetail(r.id);
        else if (r.view === 'supplier')
            supplierDetail(r.id);
        else
            go(r.view)
    }
    )
}

mountNavigation(roleAllowed);
const personalization=await createViewPersonalization({userId:user().id});
$$('.nav-item').forEach(b => b.onclick = event => {
    // Los clics modificados conservan el comportamiento nativo de los enlaces.
    if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0)return;
    event.preventDefault();go(b.dataset.view);
});
window.addEventListener('hashchange',()=>go(window.location.hash.slice(1) || 'dashboard'));
// Recargar es explícito para conservar formularios y capturas abiertos en cada pestaña.
$('#refreshModule').onclick=async()=>{
    if($('#modalRoot').children.length)return toast('Cierra la captura abierta antes de actualizar.');
    const button=$('#refreshModule');button.disabled=true;
    try {Object.assign(S,await loadState());await personalization.reload();render();toast('Datos actualizados.');}
    catch(e){toast(e.message);}finally{button.disabled=false;}
};
$('#moduleBack').onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();go(parentView(currentView));};
$('#newQuoteTop').onclick = () => openQuoteForm();
$('#userCard').onclick = () => { sidebarControls.closeMobile(); switchUser(); };
$('#globalSearch').oninput = globalSearch;
document.addEventListener('click', e => {
    if (!e.target.closest('.global-search') && !e.target.closest('.search-results'))
        $('.search-results')?.remove()
}
);
render();

function renderHub(view){
 const info=routeInfo(view);setPage(info?.[1] || 'Módulos','CC GROMEX · CONTROL OPERATIVO');
 $('#content').innerHTML=sectionHead(info?.[1] || 'Módulos',info?.[3] || 'Selecciona el módulo que necesitas.')+hubMarkup(view,roleAllowed);
 $$('[data-hub-view]').forEach(a=>a.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();go(a.dataset.hubView);});
}
function renderWarehouses(){
 setPage('Almacenes','GESTIÓN · INVENTARIO');const own=user().warehouseId || 'alm-principal';
 const rows=S.warehouses.filter(w=>user().role==='Administrador' || w.active && (user().canViewOtherWarehouses || w.id===own));
 $('#content').innerHTML=sectionHead('Almacenes','Consulta los productos disponibles en cada almacén.',user().role==='Administrador'?'<button class="primary" id="manageWarehouses">Administrar almacenes</button>':'')+`<div class="module-hub">${rows.map(w=>`<button class="module-card" data-warehouse="${esc(w.id)}">${icon('warehouse')}<h3>${esc(w.name)}</h3><p>${w.active?'Activo':'Inactivo'} · ${num((S.warehouseStocks || []).filter(r=>r.kind==='product' && r.warehouseId===w.id).reduce((s,r)=>s+r.qty,0))} piezas</p><span>Consultar productos</span></button>`).join('')}</div>`;
 if($('#manageWarehouses'))$('#manageWarehouses').onclick=warehouseModal;
 $$('[data-warehouse]').forEach(b=>b.onclick=()=>{inventoryWarehouseId=b.dataset.warehouse;go('products');});
}
function focusSubmodule(){
 const root=$('#content'),v=currentView,info=routeInfo(v);
 if(!info || parentView(v)===v)return;
 let keep=[];
 if(['materials','products','movements'].includes(v)){
  const sections=[...root.querySelectorAll('.inventory-section')];
  keep=v==='materials'?[sections[0]]:v==='products'?[sections[1]]:[$('#inventorySearch')?.closest('article')];
  keep.push(root.querySelector('.warehouse-toolbar'));
  if(v!=='movements')keep.push(root.querySelector('.stock-filter'));
  if($('#newMaterial'))$('#newMaterial').hidden=v!=='materials';
 }else if(v==='directCosts')keep=[$('#productCostAnalysis')?.closest('article')];
 else if(v==='indirectCosts')keep=[$('#costStandard')?.closest('article'),$('#indirectCostRows')?.closest('article'),root.querySelector('.metrics')];
 else if(v==='productionReport')keep=[$('#productionCostResults')?.closest('article')];
 else if(v==='financialReport')keep=[$('#monthlyReportResults')?.closest('article')];
 else if(v==='auditReport')keep=[$('#monthlyAuditPanel')];
 else if(v==='companySettings')keep=[$('#coName')?.closest('article')];
 else if(v==='userSettings')keep=[$('[data-user-edit]')?.closest('article')];
 else if(v==='permissionSettings')keep=[$('#saveRolePermissions')?.closest('article')];
 else return;
 keep=keep.filter(Boolean);
 const header=root.firstElementChild;
 for(const child of [...root.children])if(child!==header){if(keep.includes(child))continue;if(keep.some(k=>child.contains(k))){child.style.display='block';for(const sub of [...child.children])sub.hidden=!keep.some(k=>sub===k||sub.contains(k));}else child.hidden=true;}
 if(header){const h=header.querySelector('h2');if(h)h.textContent=info[1];const desc=header.querySelector('p');if(desc)desc.textContent=info[3];}
 if(['productionReport','financialReport','auditReport'].includes(v))header?.querySelectorAll('button').forEach(b=>b.hidden=true);
 if($('#newUser'))$('#newUser').hidden=v!=='userSettings';
 setPage(info[1],parentView(v)==='admin'?'SISTEMA · CONFIGURACIÓN':parentView(v)==='reports'?'ADMINISTRACIÓN · REPORTES':parentView(v)==='costs'?'PRODUCCIÓN · COSTOS FIJOS':'GESTIÓN · INVENTARIO');
}
