/**=============== Variables ===================**/
let cy = null;
let nodeTypes = null;

/**=============== Receive Data (Listener) ===================**/
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SUBGRAPH_DATA') {
            console.log("[INFO] Subgraph-Daten empfangen:", event.data.payload);
            const subgraphData = event.data.payload;
            hideLoader();
            initializeCytoscape(subgraphData);
        }
    });
    showLoader();
});

// ... (Layout Definitions bleiben gleich) ...
const LAYOUTS = { /* ... */ 
    cola: () => ({ name: 'cola', animate: false, maxSimulationTime: 3000, fit: true, padding: 30 }),
    klay: () => ({ name: 'klay', nodeDimensionsIncludeLabels: true, fit: true, padding: 30, animate: true, animationDuration: 500, klay: { direction: 'DOWN', spacing: 50, borderSpacing: 20, layoutHierarchy: true, edgeRouting: 'ORTHOGONAL' } }),
    'cose-bilkent': () => ({ name: 'cose-bilkent', animate: false, fit: true, padding: 30, nodeDimensionsIncludeLabels: true, idealEdgeLength: 100, nodeRepulsion: 4500 }),
    fcose: () => ({ name: 'fcose', animate: false, fit: true, padding: 30, nodeDimensionsIncludeLabels: true, idealEdgeLength: 100 }),
    dagre: () => ({ name: 'dagre', fit: true, padding: 30, animate: true, animationDuration: 500, rankDir: 'TB', nodeSep: 50, rankSep: 100 }),
    spread: () => ({ name: 'spread', animate: false, fit: true, padding: 30, minDist: 50 }),
    circle: () => ({ name: 'circle', fit: true, padding: 30, animate: false, avoidOverlap: true, clockwise: true }),
    concentric: () => ({ name: 'concentric', fit: true, padding: 30, animate: false, avoidOverlap: true, nodeDimensionsIncludeLabels: true, minNodeSpacing: 50 }),
    breadthfirst: () => ({ name: 'breadthfirst', fit: true, padding: 30, animate: false, directed: true, spacingFactor: 1.5, avoidOverlap: true }),
    grid: () => ({ name: 'grid', fit: true, padding: 30, animate: false, avoidOverlap: true }),
    cose: () => ({ name: 'cose', animate: false, fit: true, padding: 30, nestingFactor: 5, gravity: 80, numIter: 1000 }),
};

function applyLayout(layoutName) {
    if (!cy || !LAYOUTS[layoutName]) return;
    cy.layout({
        ...LAYOUTS[layoutName](),
        stop: () => {
            handleIsolatedNodes(cy);
            cy.fit(cy.nodes(), 50);
        }
    }).run();
}

document.getElementById('layout-select')?.addEventListener('change', e => applyLayout(e.target.value));

/**=============== Loader Helpers ===================**/
function showLoader() { const l = document.getElementById('loader-overlay'); if(l) l.classList.remove('hidden'); }
function hideLoader() { const l = document.getElementById('loader-overlay'); if(l) l.classList.add('hidden'); }

/**=============== Data Transformation ===================**/
function transformData(data) {
    if (!data || !data.nodes) return [];
    const nodes = data.nodes.map(n => ({
        group: 'nodes',
        data: {
            id: n.data.node_id.toString(),
            name: n.data.node_name,
            kind: n.data.node_attributes?.kind ? n.data.node_attributes.kind[0] : 'unknown',
            body: n.data.node_attributes?.body ? n.data.node_attributes.body[0] : 'unknown',
            prop: n.data.node_attributes?.prop ? n.data.node_attributes.prop[0] : 'unknown',
            path: n.data.node_attributes?.path ? n.data.node_attributes.path[0] : '',
            filename: n.data.filename
        }
    }));
    const edges = data.edges.map((e, i) => ({
        group: 'edges',
        data: {
            id: 'e' + i,
            source: e.data.source_node_id.toString(),
            target: e.data.target_node_id.toString(),
            weight: e.data.edge_attributes?.weight ? e.data.edge_attributes.weight[0] : 1,
            filename: e.data.filename
        }
    }));
    return nodes.concat(edges);
}

/**=============== NEW: Update Statistics ===================**/
function updateGraphStats(elements) {
    let nodeCount = 0;
    let edgeCount = 0;
    if (elements && Array.isArray(elements)) {
        elements.forEach(el => {
            if (el.group === 'nodes') nodeCount++;
            if (el.group === 'edges') edgeCount++;
        });
    }
    const nodeEl = document.getElementById('stat-nodes');
    const edgeEl = document.getElementById('stat-edges');
    if (nodeEl) nodeEl.textContent = nodeCount;
    if (edgeEl) edgeEl.textContent = edgeCount;
}

/**=============== Cytoscape Initialization ===================**/
function initializeCytoscape(subgraphData) {
    const elements = transformData(subgraphData);
    
    // HIER: Statistik updaten
    updateGraphStats(elements);

    // ... Rest bleibt fast gleich ...
    let isLargeGraph = elements.length > 200;

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        hideEdgesOnViewport: isLargeGraph,
        textureOnViewport: isLargeGraph,
        motionBlur: isLargeGraph,
        pixelRatio: 'auto',
        style: [
             {
                selector: 'node',
                style: {
                    label: 'data(name)', 'text-valign': 'center', 'text-halign': 'center',
                    'font-size': '10px', 'text-wrap': 'wrap', 'text-max-width': '60px',
                    shape: 'ellipse', 'background-color': '#94a3b8',
                    'border-width': 1, 'border-color': '#64748b', color: '#1e293b',
                    'text-outline-color': '#ffffff', 'text-outline-width': 0.5, 'min-zoomed-font-size': 8
                }
            },
            { selector: 'node[body="yes"]', style: { shape: 'pentagon' } },
            { selector: 'node[body="no"]', style: { shape: 'hexagon' } },
            { selector: 'node[prop="yes"]', style: { shape: 'octagon' } },
            { selector: 'node[prop="no"]', style: { shape: 'star' } },
            { selector: 'node[kind="cnst"]', style: { 'background-color': '#FF6D00' } },
            { selector: 'node[kind="inductive"]', style: { 'background-color': '#7C4DFF' } },
            { selector: 'node[kind="construct"]', style: { 'background-color': '#40C4FF' } },
            { selector: 'node[body="yes"][prop="no"]', style: { shape: 'diamond' } },
            { selector: 'node[body="no"][prop="yes"]', style: { shape: 'rectangle' } },
            { selector: 'node[body="no"][prop="no"]', style: { shape: 'triangle' } },
            {
                selector: 'edge',
                style: {
                    width: 2, 'line-color': '#cbd5e1', 'target-arrow-color': '#94a3b8',
                    'target-arrow-shape': 'triangle', 'curve-style': 'bezier', opacity: 0.8
                }
            },
            { selector: 'node.search-hit', style: { 'background-color': '#fcff82', 'border-color': '#f8da5b', 'border-width': 4, 'font-weight': 'bold' } }
        ]
    });

    cy.batch(() => {
        cy.nodes().forEach(n => {
            const size = Math.max(n.degree() * 10, 40);
            n.style({ width: size, height: size });
        });
    });

    let defaultLayoutName = isLargeGraph ? 'cola' : 'klay';
    applyLayout(defaultLayoutName);
    const ls = document.getElementById('layout-select');
    if(ls) ls.value = defaultLayoutName;

    // Search & Tooltips
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => searchNode(searchInput.value));
    }
    cy.on('tap', 'node', evt => evt.target.qtip?.({
        content:
            `ID: ${evt.target.id()}<br>Name: ${evt.target.data('name')}<br>Kind: ${evt.target.data('kind')}
             <br>Property: ${evt.target.data('prop')}<br>Body: ${evt.target.data('body')}
             <br>Path: ${evt.target.data('path')}`,
        show: { event: 'tap', ready: true },
        hide: { event: 'unfocus' },
        style: { classes: 'qtip-tipsy' }
    }).show());
}

/**=============== Helpers & Downloads ===================**/
function searchNode(query) {
    if (!cy || !query) return;
    const q = query.trim();
    cy.nodes().removeClass('search-hit');
    const matches = cy.nodes().filter(n => n.id() === q || (n.data('name') && n.data('name') === q));
    if (matches.length === 0) { alert('Node not found'); return; }
    const node = matches[0];
    node.addClass('search-hit');
    cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.5) }, { duration: 500 });
}

function handleIsolatedNodes(cy) {
    const isolated = cy.nodes().filter(n => n.degree() === 0);
    const connected = cy.nodes().filter(n => n.degree() > 0);
    if (!isolated.length) return;
    cy.batch(() => {
        const bb = connected.boundingBox();
        isolated.forEach((n, i) => n.position({ x: (bb?.x1 || 100) + i * 150, y: (bb?.y2 || 100) + 200 }));
    });
}

function saveFile(blob, filename) {
    const a = document.createElement('a');
    document.body.appendChild(a); a.style.display = 'none';
    const url = window.URL.createObjectURL(blob);
    a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
}

document.getElementById('zoom-in')?.addEventListener('click', () => cy?.zoom(cy.zoom() * 1.2));
document.getElementById('zoom-out')?.addEventListener('click', () => cy?.zoom(cy.zoom() / 1.2));
document.getElementById('instructions-button')?.addEventListener('click', () => window.open('/Frontend/instructions.html', '_blank'));

document.getElementById('download-png')?.addEventListener('click', () => {
    if (!cy) return;
    try { saveFile(cy.png({ output: 'blob', full: true, scale: 3, bg: 'white' }), 'subgraph.png'); } catch (e) { console.error(e); }
});
document.getElementById('download-svg')?.addEventListener('click', () => {
    if (!cy || typeof cy.svg !== 'function') return;
    try { saveFile(new Blob([cy.svg({ full: true, scale: 1, bg: 'white' })], { type: 'image/svg+xml;charset=utf-8' }), 'subgraph.svg'); } catch (e) { console.error(e); }
});
document.getElementById('download-pdf')?.addEventListener('click', () => {
    if (!cy || !window.jspdf) return;
    try {
        const bb = cy.elements().boundingBox();
        const pngData = cy.png({ output: 'base64uri', full: true, scale: 2, bg: 'white' });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: bb.w > bb.h ? 'l' : 'p', unit: 'px', format: [bb.w + 50, bb.h + 50] });
        pdf.addImage(pngData, 'PNG', 25, 25, bb.w, bb.h);
        pdf.save('subgraph.pdf');
    } catch (e) { console.error(e); }
});
document.getElementById('download-data')?.addEventListener('click', () => {
    if (!cy) return;
    saveFile(new Blob([JSON.stringify(cy.json(), null, 2)], { type: 'application/json' }), 'subgraph_data.json');
});