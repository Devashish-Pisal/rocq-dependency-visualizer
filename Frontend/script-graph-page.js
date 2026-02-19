/**=============== Variables ===================**/
let cy = null;
let isLargeGraph = false;
let defaultLayoutName = null;
let originalGraphData = null;
let nodeTypes = null;
let highlightedElements = null;
let filenames = null;

/**=============== Get Data for the DOM ===================**/
document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/graph')
    .then(res => res.json())
    .then(data => {
      originalGraphData = data.graph_data;
      nodeTypes = data.node_types;
      filenames = getFilesFromGraphData(originalGraphData);
      appendFilesToVisualizeSelect(filenames);
      initializeCytoscape(originalGraphData);
      disableFeatures(filenames);
      // Debugging Prints
      console.log("[INFO] Received parser output for complete project:", originalGraphData);
      console.log("[INFO] Node types:", nodeTypes);
      console.log("[INFO] Uploaded files:", filenames);
    })
    .catch(err => console.error(err));
});

/**=============== Layout Definitions ===================**/
const LAYOUTS = {
    cola: () => ({ name: 'cola', animate: false, maxSimulationTime: 3000, fit: true, padding: 30 }),
    klay: () => ({ 
        name: 'klay', nodeDimensionsIncludeLabels: true, fit: true, padding: 30, animate: true, 
        animationDuration: 500, klay: { direction: 'DOWN', spacing: 50, borderSpacing: 20, layoutHierarchy: true, edgeRouting: 'ORTHOGONAL' } 
    }),
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

/**=============== Select Layout - Feature ===================**/
function applyLayout(layoutName) {
    if (!cy || !LAYOUTS[layoutName]) return;
    showLoader();
    cy.layout({
        ...LAYOUTS[layoutName](),
        stop: () => {
            handleIsolatedNodes(cy);
            cy.fit(cy.nodes(), 50);
            hideLoader();
        }
    }).run();
}

document.getElementById('layout-select')?.addEventListener('change', e => applyLayout(e.target.value));


/**=============== Loader Function ===================**/
function showLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('hidden');
}


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

/**=============== Search Node - Function ===================**/
function searchNode(query) {
    if (!cy || !query) return;
    const q = query.trim();
    cy.nodes().removeClass('search-hit');
    const matches = cy.nodes().filter(n =>
        n.id() === q || (n.data('name') && n.data('name') === q)
    );
    if (matches.length === 0) {
        alert('Node not found');
        return;
    }
    const node = matches[0];
    node.addClass('search-hit');
    cy.animate({
        center: { eles: node },
        zoom: Math.max(cy.zoom(), 1.5)
    }, { duration: 500 });
}

/**=============== Cytoscape Initialization ===================**/
function initializeCytoscape(rawData) {
    const elements = transformData(rawData);
    updateGraphStats(elements);
    isLargeGraph = elements.length > 200;

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements,
        hideEdgesOnViewport: isLargeGraph,
        textureOnViewport: isLargeGraph,
        motionBlur: isLargeGraph,
        pixelRatio: 'auto',
        style: [
            {
                selector: 'node',
                style: {
                    label: 'data(name)',
                    'text-valign': 'center', 'text-halign': 'center',
                    'font-size': '10px', 'text-wrap': 'wrap', 'text-max-width': '60px',
                    shape: 'ellipse',
                    'background-color': '#94a3b8',
                    'border-width': 1, 'border-color': '#64748b',
                    color: '#1e293b',
                    'text-outline-color': '#ffffff', 'text-outline-width': 0.5,
                    'min-zoomed-font-size': 8
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
                    width: isLargeGraph ? 1 : 2,
                    'line-color': '#cbd5e1',
                    'target-arrow-color': '#94a3b8',
                    'target-arrow-shape': isLargeGraph ? 'none' : 'triangle',
                    'curve-style': isLargeGraph ? 'haystack' : 'bezier',
                    opacity: isLargeGraph ? 0.4 : 0.8
                }
            },
            { selector: 'node.search-hit', style: { 'background-color': '#fcff82', 'border-color': '#f8da5b', 'border-width': 4, 'font-weight': 'bold' } },
            { selector: 'node.clicked', style: { 'background-color': '#f7ec77','border-color': '#ffe700', 'border-width': 4,'font-size': '20px'} },
            { selector: 'node.outgoing', style: { 'background-color': '#4ef037','border-color': '#388e3c', 'border-width': 4,'font-size': '20px' } },
            { selector: 'node.incoming', style: { 'background-color': '#fb7777','border-color': '#ff0000','border-width': 4,'font-size': '20px' } },
            { selector: 'edge.outgoing', style: { 'line-color': '#388e3c','target-arrow-color': '#388e3c', width: 4,'opacity': 1,'curve-style': 'bezier','target-arrow-shape': 'triangle', 'arrow-scale': 2.5}},
            { selector: 'edge.incoming', style: { 'line-color': '#ff0000','target-arrow-color': '#ff0000', width: 4,'opacity': 1,'curve-style': 'bezier','target-arrow-shape': 'triangle', 'arrow-scale': 2.5}},
            { selector: '.faded', style: { opacity: 0.15 } },
            { selector: 'node.dimmed', style: { 'opacity': 0.1, 'border-color': '#e0e0e0', 'color': '#eeeeee' } },
            { selector: 'edge.dimmed', style: { 'opacity': 0.05 } },
            { selector: 'node.highlighted', style: { 'background-color': '#ffeb3b', 'border-color': '#ff9800', 'border-width': 5, 'width': 50, 'height': 50, 'font-size': '14px', 'font-weight': 'bold', 'z-index': 9999, 'opacity': 1 } },
            { selector: 'edge.highlighted', style: { 'line-color': '#2196F3', 'target-arrow-color': '#2196F3', 'width': 4, 'opacity': 1, 'z-index': 999 } },
            { selector: 'node.connected-to-highlighted', style: { 'opacity': 1, 'border-color': '#2196F3', 'border-width': 3 } }
        ]
    });

    cy.batch(() => {
        cy.nodes().forEach(n => {
            const size = isLargeGraph ? Math.max(n.degree() * 5, 20) : Math.max(n.degree() * 10, 40);
            n.style({ width: size, height: size });
        });
    });

    defaultLayoutName = isLargeGraph ? 'cola' : 'klay';
    applyLayout(defaultLayoutName);
    document.getElementById('layout-select').value = defaultLayoutName;

    // Search Feature
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => searchNode(searchInput.value));
    }

    // Graph Interaction
    cy.on('tap', 'node', evt => {
        const n = evt.target;
        if (highlightedElements?.contains(n)) return clearHighlight();
        clearHighlight();
        const outE = n.connectedEdges().filter(e => e.source().id() === n.id());
        const inE = n.connectedEdges().filter(e => e.target().id() === n.id());
        highlightedElements = n.add(outE).add(inE).add(outE.targets()).add(inE.sources());
        cy.elements().addClass('faded');
        n.removeClass('faded').addClass('clicked');
        outE.removeClass('faded').addClass('outgoing');
        inE.removeClass('faded').addClass('incoming');
        outE.targets().removeClass('faded').addClass('outgoing');
        inE.sources().removeClass('faded').addClass('incoming');
        document.getElementById('subgraph-button').disabled = false;
    });

    cy.on('tap', evt => evt.target === cy && clearHighlight());

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

/**=============== Subgraph Visualization ===================**/
document.getElementById('subgraph-button')?.addEventListener('click', () => {
    if (!highlightedElements || !originalGraphData) return;
    const nodeIds = new Set(highlightedElements.nodes().map(n => n.id()));
    const edgeIds = new Set(highlightedElements.edges().map(e => e.id()));
    
    // Safety check for ID matching (String vs Int)
    const subNodes = originalGraphData.nodes.filter(n => nodeIds.has(n.data.node_id.toString()));
    const subEdges = originalGraphData.edges.filter((e, i) => edgeIds.has('e' + i));
    
    const subgraph = { nodes: subNodes, edges: subEdges };
    const win = window.open("Frontend/subgraph-page.html", "_blank");
    const sendData = () => {
        if (win && !win.closed) {
            win.postMessage({ type: 'SUBGRAPH_DATA', payload: subgraph }, window.location.origin);
        }
    };
    setTimeout(sendData, 500);
});

/**=============== Zoom In & Out ===================**/
document.getElementById('zoom-in')?.addEventListener('click', () => cy?.zoom(cy.zoom() * 1.2));
document.getElementById('zoom-out')?.addEventListener('click', () => cy?.zoom(cy.zoom() / 1.2));
document.getElementById('instructions-button')?.addEventListener('click', () => window.open('/Frontend/instructions.html', '_blank'));

/**=============== Sidebar Logic ===================**/
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('controls');
    const toggleBtn = document.getElementById('menu-toggle'); 
    const closeBtn = document.getElementById('sidebar-close'); 
    
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        
        setTimeout(() => { 
            if (cy) cy.resize(); 
        }, 310);
    }

    if (sidebar) {
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleSidebar);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleSidebar);
        }
    }
});

/**=============== Download Functions ===================**/
document.addEventListener('DOMContentLoaded', function() {
    function checkCy() { if (!cy) { alert("Graph lädt noch..."); return false; } return true; }

    document.getElementById('download-png')?.addEventListener('click', () => {
        if (!checkCy()) return;
        try {
            const blob = cy.png({ output: 'blob', full: true, scale: 3, bg: 'white' });
            saveFile(blob, 'graph.png');
        } catch (e) { console.error(e); }
    });

    document.getElementById('download-svg')?.addEventListener('click', () => {
        if (!checkCy()) return;
        if (typeof cy.svg !== 'function') { alert("SVG Plugin fehlt!"); return; }
        try {
            const content = cy.svg({ full: true, scale: 1, bg: 'white' });
            const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
            saveFile(blob, 'graph.svg');
        } catch (e) { console.error(e); }
    });

    document.getElementById('download-pdf')?.addEventListener('click', () => {
        if (!checkCy()) return;
        if (typeof window.jspdf === 'undefined') { alert("jsPDF fehlt!"); return; }
        try {
            const bb = cy.elements().boundingBox();
            const w = bb.w; const h = bb.h;
            const pngData = cy.png({ output: 'base64uri', full: true, scale: 2, bg: 'white' });
            const { jsPDF } = window.jspdf;
            const orientation = w > h ? 'l' : 'p';
            const pdf = new jsPDF({ orientation: orientation, unit: 'px', format: [w + 50, h + 50] });
            pdf.addImage(pngData, 'PNG', 25, 25, w, h);
            pdf.save('graph.pdf');
        } catch (e) { console.error(e); }
    });

    document.getElementById('download-data')?.addEventListener('click', () => {
        if (!checkCy()) return;
        const json = JSON.stringify(cy.json(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        saveFile(blob, 'graph_data.json');
    });
});

/**=============== Highlight Logic ===================**/
document.getElementById('highlight-nodes-select')?.addEventListener('change', function(e) {
    if (!cy || !nodeTypes) return;
    const selectedType = e.target.value;
    cy.elements().removeClass('dimmed highlighted');
    if (selectedType === 'select') return;

    cy.elements().addClass('dimmed');
    const targets = cy.nodes().filter(node => {
        const nodeName = node.data('name');
        const validNames = nodeTypes[selectedType];
        return validNames && validNames.includes(nodeName);
    });

    if (targets.length > 0) {
        targets.removeClass('dimmed').addClass('highlighted');
    } else {
        cy.elements().removeClass('dimmed');
        alert(`Keine Knoten für Typ "${selectedType}" gefunden.`);
        e.target.value = 'select';
    }
});

document.getElementById('highlight-edges-select')?.addEventListener('change', function(e) {
    if (!cy || !nodeTypes) return;
    const selectedType = e.target.value;
    cy.elements().removeClass('dimmed highlighted connected-to-highlighted');
    if (selectedType === 'select') return;

    const validNames = nodeTypes[selectedType];
    if (!validNames || validNames.length === 0) {
        alert(`Keine Knoten für Typ "${selectedType}" gefunden.`);
        e.target.value = 'select';
        return;
    }

    cy.elements().addClass('dimmed');
    const targetEdges = cy.edges().filter(edge => {
        const sName = edge.source().data('name');
        const tName = edge.target().data('name');
        return validNames.includes(sName) && validNames.includes(tName);
    });

    if (targetEdges.length > 0) {
        targetEdges.removeClass('dimmed').addClass('highlighted');
        targetEdges.connectedNodes().removeClass('dimmed').addClass('connected-to-highlighted');
    } else {
        cy.elements().removeClass('dimmed');
        alert(`Keine Verbindungen zwischen ${selectedType} gefunden.`);
        e.target.value = 'select';
    }
});
/**=============== Node Coloring Feature ===================**/
document.addEventListener('DOMContentLoaded', function() {
    
    const COLORS = {
        'pink': '#d59bf6',
        'yellow': '#f8f398',
        'turquoise': '#8ef6e4'
    };

    function setupColorListener(dropdownId, typeKey) {
        const select = document.getElementById(dropdownId);
        
        if (select) {
            select.addEventListener('change', function(e) {
                if (!cy || !nodeTypes) return;
                
                const selectedColor = e.target.value;
                const targetNames = nodeTypes[typeKey]; 

                if (!targetNames) {
                    console.warn(`Typ '${typeKey}' nicht in den Daten gefunden.`);
                    return;
                }

                cy.batch(() => {
                    const nodesOfType = cy.nodes().filter(n => targetNames.includes(n.data('name')));
                    
                    nodesOfType.removeStyle('background-color');
                    if (selectedColor === 'select') return;

                    if (COLORS[selectedColor]) {
                        nodesOfType.style('background-color', COLORS[selectedColor]);
                    }
                });
            });
        }
    }


    setupColorListener('lemma-node-color', 'lemma');
    setupColorListener('definition-node-color', 'definition');
    setupColorListener('theorem-node-filter', 'theorem'); 
});

/**=============== Visualize Select ===================**/
document.getElementById('visualize-select')?.addEventListener('change', (event) => {
    const value = event.target.value;
    cy.elements().remove();
    if (value === 'project') {
        initializeCytoscape(originalGraphData);
    } else {
        const data = extractSingleFileData(value);
        initializeCytoscape(data);
    }
});

function extractSingleFileData(filename) {
    const nodes = originalGraphData.nodes.filter(n => n.data.filename === filename);
    const edges = originalGraphData.edges.filter(e => e.data.filename === filename);
    return { nodes: nodes, edges: edges };
}

function getFilesFromGraphData(graphData) {
    const files = new Set();
    if (!graphData) return [];
    if (Array.isArray(graphData.nodes)) graphData.nodes.forEach(n => { if (n.data?.filename) files.add(n.data.filename); });
    return Array.from(files).sort();
}

function appendFilesToVisualizeSelect(filenames) {
    const select = document.getElementById('visualize-select');
    if (!select) return;
    Array.from(select.querySelectorAll('option[data-file]')).forEach(opt => opt.remove());
    filenames.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = filename;
        option.dataset.file = "true";
        select.appendChild(option);
    });
}

/**=============== Helper Functions ===================**/
function clearHighlight() {
    cy.elements().removeClass('faded clicked incoming outgoing');
    highlightedElements = null;
    document.getElementById('subgraph-button').disabled = true;
}

function saveFile(blob, filename) {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

/**=============== Update Statistics ===================**/
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

/**=============== Disabling highlight feature and color coding feature when .v files are not uploaded ===================**/
function disableFeatures(filenames) {
    const hasVFile = filenames.some(name => name.endsWith(".v"));
    const nodeSelect = document.getElementById("highlight-nodes-select");
    const edgeSelect = document.getElementById("highlight-edges-select");
    const lemmaNodes = document.getElementById("lemma-node-color");
    const definitionNodes = document.getElementById("definition-node-color");
    const theoremNodes = document.getElementById("theorem-node-filter");

    nodeSelect.disabled = !hasVFile;
    edgeSelect.disabled = !hasVFile;
    lemmaNodes.disabled = !hasVFile;
    definitionNodes.disabled = !hasVFile;
    theoremNodes.disabled = !hasVFile;

    nodeSelect.classList.toggle("faded", !hasVFile);
    edgeSelect.classList.toggle("faded", !hasVFile);
    lemmaNodes.classList.toggle("faded", !hasVFile);
    definitionNodes.classList.toggle("faded", !hasVFile);
    theoremNodes.classList.toggle("faded", !hasVFile);

    if (!hasVFile) {
        nodeSelect.value = "select";
        edgeSelect.value = "select";
        lemmaNodes.value = "select";
        definitionNodes.value = "select";
        theoremNodes.value = "select";
    }
}
