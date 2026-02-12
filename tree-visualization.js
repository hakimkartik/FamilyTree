// Global variables
let treeData = null;
let peopleMap = {};
let relationships = [];
let rootPersonId = null;

// SVG dimensions
const width = 1600;
const height = 1200;
const nodeRadius = 25;
const horizontalSpacing = 200;
const verticalSpacing = 150;

// Initialize visualization
async function init() {
    try {
        // Check if D3 is loaded
        if (typeof d3 === 'undefined') {
            throw new Error('D3.js library not loaded. Please check your internet connection.');
        }
        
        console.log('Starting to load family tree...');
        console.log('D3.js version:', d3.version);
        
        // Load the family tree data
        const response = await fetch('family1.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('JSON file loaded, parsing...');
        treeData = await response.json();
        console.log('Tree data loaded:', treeData);
        
        // Build people map for quick lookup
        treeData.people.forEach(person => {
            peopleMap[person.id] = person;
        });
        
        relationships = treeData.relationships;
        rootPersonId = treeData.meta.rootPersonId || treeData.people[0].id;
        
        console.log(`Loaded ${treeData.people.length} people and ${relationships.length} relationships`);
        console.log('Root person ID:', rootPersonId);
        
        // Build and render the tree
        console.log('Rendering tree...');
        renderTree();
        console.log('Tree rendered successfully');
        
        // Hide loading message after rendering
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        // Update edit forms if in edit mode
        if (typeof updateEditForms === 'function') {
            updateEditForms();
        }
    } catch (error) {
        console.error('Error loading family tree:', error);
        console.error('Error stack:', error.stack);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.textContent = `Error: ${error.message}. Open browser console (F12) for details.`;
            loadingEl.style.color = 'red';
            loadingEl.style.fontSize = '16px';
            loadingEl.style.fontWeight = 'bold';
            loadingEl.style.padding = '20px';
        }
        // Also show error in an alert for immediate visibility
        alert(`Error loading family tree: ${error.message}\n\nPlease check the browser console (F12) for more details.`);
    }
}

// Build tree structure from relationships
function buildTreeStructure() {
    const rootPersonCheck = peopleMap[rootPersonId];
    if (!rootPersonCheck) {
        console.error('Root person not found:', rootPersonId);
        return null;
    }
    
    // Build adjacency lists
    const children = {}; // parentId -> [childIds]
    const parents = {};   // childId -> [parentIds]
    const spouses = {};   // personId -> [spouseIds]
    
    relationships.forEach(rel => {
        if (rel.type === 'parentChild') {
            const parentId = rel.parentId;
            const childId = rel.childId;
            
            if (!children[parentId]) children[parentId] = [];
            children[parentId].push(childId);
            
            if (!parents[childId]) parents[childId] = [];
            parents[childId].push(parentId);
        } else if (rel.type === 'spouse') {
            const [p1, p2] = rel.people;
            if (!spouses[p1]) spouses[p1] = [];
            if (!spouses[p2]) spouses[p2] = [];
            spouses[p1].push(p2);
            spouses[p2].push(p1);
        }
    });
    
    // Build node structure - separate function for upward (ancestors) and downward (descendants)
    function buildNodeDown(personId, visited = new Set(), level = 0) {
        if (visited.has(personId)) return null;
        visited.add(personId);
        
        const person = peopleMap[personId];
        if (!person) return null;
        
        const node = {
            id: personId,
            name: person.name,
            gender: person.gender,
            aliases: person.aliases || [],
            birthYear: person.birthYear,
            deathYear: person.deathYear,
            level: level,
            children: [],
            spouses: []
        };
        
        // Add children (going downward)
        if (children[personId]) {
            children[personId].forEach(childId => {
                const childNode = buildNodeDown(childId, visited, level + 1);
                if (childNode) node.children.push(childNode);
            });
        }
        
        // Add spouses at same level
        if (spouses[personId]) {
            spouses[personId].forEach(spouseId => {
                if (!visited.has(spouseId)) {
                    const spouse = peopleMap[spouseId];
                    if (spouse) {
                        node.spouses.push({
                            id: spouseId,
                            name: spouse.name,
                            gender: spouse.gender,
                            aliases: spouse.aliases || [],
                            birthYear: spouse.birthYear,
                            deathYear: spouse.deathYear,
                            level: level
                        });
                    }
                }
            });
        }
        
        return node;
    }
    
    function buildNodeUp(personId, visited = new Set(), level = 0, excludeChildId = null) {
        if (visited.has(personId)) return null;
        visited.add(personId);
        
        const person = peopleMap[personId];
        if (!person) return null;
        
        const node = {
            id: personId,
            name: person.name,
            gender: person.gender,
            aliases: person.aliases || [],
            birthYear: person.birthYear,
            deathYear: person.deathYear,
            level: level,
            children: [],
            spouses: [],
            siblings: []
        };
        
        // Add parents (going upward)
        if (parents[personId]) {
            parents[personId].forEach(parentId => {
                const parentNode = buildNodeUp(parentId, visited, level - 1, personId);
                if (parentNode) {
                    if (!node.parents) node.parents = [];
                    node.parents.push(parentNode);
                }
            });
        }
        
        // Add siblings - all other children of the same parents
        if (parents[personId]) {
            const allSiblings = new Set();
            parents[personId].forEach(parentId => {
                if (children[parentId]) {
                    children[parentId].forEach(siblingId => {
                        if (siblingId !== personId && siblingId !== excludeChildId && !visited.has(siblingId)) {
                            allSiblings.add(siblingId);
                        }
                    });
                }
            });
            
            allSiblings.forEach(siblingId => {
                const sibling = peopleMap[siblingId];
                if (sibling) {
                    node.siblings.push({
                        id: siblingId,
                        name: sibling.name,
                        gender: sibling.gender,
                        aliases: sibling.aliases || [],
                        birthYear: sibling.birthYear,
                        deathYear: sibling.deathYear,
                        level: level
                    });
                }
            });
        }
        
        // Add spouses at same level
        if (spouses[personId]) {
            spouses[personId].forEach(spouseId => {
                if (!visited.has(spouseId)) {
                    const spouse = peopleMap[spouseId];
                    if (spouse) {
                        node.spouses.push({
                            id: spouseId,
                            name: spouse.name,
                            gender: spouse.gender,
                            aliases: spouse.aliases || [],
                            birthYear: spouse.birthYear,
                            deathYear: spouse.deathYear,
                            level: level
                        });
                    }
                }
            });
        }
        
        return node;
    }
    
    // Build root node with both upward and downward expansion
    const rootPerson = peopleMap[rootPersonId];
    const root = {
        id: rootPersonId,
        name: rootPerson.name,
        gender: rootPerson.gender,
        aliases: rootPerson.aliases || [],
        birthYear: rootPerson.birthYear,
        deathYear: rootPerson.deathYear,
        level: 0,
        children: [],
        spouses: [],
        parents: [],
        siblings: []
    };
    
    // Build downward (children)
    const visitedDown = new Set([rootPersonId]);
    if (children[rootPersonId]) {
        children[rootPersonId].forEach(childId => {
            const childNode = buildNodeDown(childId, visitedDown, 1);
            if (childNode) root.children.push(childNode);
        });
    }
    
    // Build upward (parents)
    const visitedUp = new Set([rootPersonId]);
    if (parents[rootPersonId]) {
        parents[rootPersonId].forEach(parentId => {
            const parentNode = buildNodeUp(parentId, visitedUp, -1, rootPersonId);
            if (parentNode) root.parents.push(parentNode);
        });
    }
    
    // Add siblings at root level
    if (parents[rootPersonId]) {
        const allSiblings = new Set();
        parents[rootPersonId].forEach(parentId => {
            if (children[parentId]) {
                children[parentId].forEach(siblingId => {
                    if (siblingId !== rootPersonId) {
                        allSiblings.add(siblingId);
                    }
                });
            }
        });
        
        allSiblings.forEach(siblingId => {
            const sibling = peopleMap[siblingId];
            if (sibling) {
                root.siblings.push({
                    id: siblingId,
                    name: sibling.name,
                    gender: sibling.gender,
                    aliases: sibling.aliases || [],
                    birthYear: sibling.birthYear,
                    deathYear: sibling.deathYear,
                    level: 0
                });
            }
        });
    }
    
    // Add spouses at root level
    if (spouses[rootPersonId]) {
        spouses[rootPersonId].forEach(spouseId => {
            const spouse = peopleMap[spouseId];
            if (spouse) {
                root.spouses.push({
                    id: spouseId,
                    name: spouse.name,
                    gender: spouse.gender,
                    aliases: spouse.aliases || [],
                    birthYear: spouse.birthYear,
                    deathYear: spouse.deathYear,
                    level: 0
                });
            }
        });
    }
    
    return root;
}

// Calculate positions for nodes
function calculatePositions(root) {
    const positions = {};
    const nodesByLevel = {};
    const visited = new Set();
    
    // Build children map for quick lookup
    const childrenMap = {};
    relationships.forEach(rel => {
        if (rel.type === 'parentChild') {
            if (!childrenMap[rel.parentId]) childrenMap[rel.parentId] = [];
            childrenMap[rel.parentId].push(rel.childId);
        }
    });
    
    // First pass: collect nodes by level
    function collectNodes(node, level = 0) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);
        
        if (!nodesByLevel[level]) nodesByLevel[level] = [];
        if (!nodesByLevel[level].find(n => n.id === node.id)) {
            nodesByLevel[level].push(node);
        }
        
        // Process spouses at same level
        if (node.spouses && node.spouses.length > 0) {
            node.spouses.forEach(spouse => {
                if (!visited.has(spouse.id)) {
                    if (!nodesByLevel[level]) nodesByLevel[level] = [];
                    if (!nodesByLevel[level].find(n => n.id === spouse.id)) {
                        nodesByLevel[level].push({
                            id: spouse.id,
                            name: spouse.name,
                            gender: spouse.gender,
                            aliases: spouse.aliases || [],
                            birthYear: spouse.birthYear,
                            deathYear: spouse.deathYear,
                            level: level
                        });
                    }
                }
            });
        }
        
        // Process siblings at same level
        if (node.siblings && node.siblings.length > 0) {
            node.siblings.forEach(sibling => {
                if (!visited.has(sibling.id)) {
                    if (!nodesByLevel[level]) nodesByLevel[level] = [];
                    if (!nodesByLevel[level].find(n => n.id === sibling.id)) {
                        nodesByLevel[level].push({
                            id: sibling.id,
                            name: sibling.name,
                            gender: sibling.gender,
                            aliases: sibling.aliases || [],
                            birthYear: sibling.birthYear,
                            deathYear: sibling.deathYear,
                            level: level
                        });
                        
                        // Also add spouses of siblings at the same level
                        const siblingSpouses = relationships
                            .filter(rel => rel.type === 'spouse' && 
                                (rel.people[0] === sibling.id || rel.people[1] === sibling.id))
                            .map(rel => rel.people[0] === sibling.id ? rel.people[1] : rel.people[0]);
                        
                        siblingSpouses.forEach(spouseId => {
                            if (!visited.has(spouseId) && peopleMap[spouseId]) {
                                const spouse = peopleMap[spouseId];
                                if (!nodesByLevel[level].find(n => n.id === spouseId)) {
                                    nodesByLevel[level].push({
                                        id: spouseId,
                                        name: spouse.name,
                                        gender: spouse.gender,
                                        aliases: spouse.aliases || [],
                                        birthYear: spouse.birthYear,
                                        deathYear: spouse.deathYear,
                                        level: level
                                    });
                                }
                            }
                        });
                        
                        // Also process children of siblings (nephews/nieces)
                        if (childrenMap[sibling.id]) {
                            childrenMap[sibling.id].forEach(childId => {
                                if (!visited.has(childId) && peopleMap[childId]) {
                                    const child = peopleMap[childId];
                                    const childNode = {
                                        id: childId,
                                        name: child.name,
                                        gender: child.gender,
                                        aliases: child.aliases || [],
                                        birthYear: child.birthYear,
                                        deathYear: child.deathYear,
                                        level: level + 1,
                                        children: []
                                    };
                                    collectNodes(childNode, level + 1);
                                }
                            });
                        }
                    }
                }
            });
        }
        
        // Process children (downward)
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => collectNodes(child, level + 1));
        }
        
        // Process parents (upward)
        if (node.parents && node.parents.length > 0) {
            node.parents.forEach(parent => collectNodes(parent, level - 1));
        }
    }
    
    collectNodes(root);
    
    // Second pass: assign positions
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Sort levels
    const sortedLevels = Object.keys(nodesByLevel)
        .map(Number)
        .sort((a, b) => a - b);
    
    sortedLevels.forEach(levelNum => {
        const nodes = nodesByLevel[levelNum];
        const y = centerY + levelNum * verticalSpacing;
        
        // Calculate x positions, centering around centerX
        const totalWidth = Math.max(0, (nodes.length - 1) * horizontalSpacing);
        const startX = centerX - totalWidth / 2;
        
        nodes.forEach((node, index) => {
            const x = startX + index * horizontalSpacing;
            positions[node.id] = { x, y, node };
        });
    });
    
    return positions;
}

// Render the tree
function renderTree() {
    console.log('Building tree structure...');
    const root = buildTreeStructure();
    if (!root) {
        console.error('Could not build tree structure');
        document.getElementById('loading').textContent = 'Error: Could not build tree structure. Check console for details.';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').style.color = 'red';
        return;
    }
    
    console.log('Tree structure built, calculating positions...');
    const positions = calculatePositions(root);
    console.log('Positions calculated:', Object.keys(positions).length, 'nodes');
    
    if (Object.keys(positions).length === 0) {
        console.error('No positions calculated - tree might be empty');
        document.getElementById('loading').textContent = 'Error: No nodes to display. Check if family tree data is correct.';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').style.color = 'red';
        return;
    }
    
    // Clear previous rendering
    const svgElement = document.getElementById('tree-svg');
    if (!svgElement) {
        console.error('SVG element not found!');
        return;
    }
    d3.select('#tree-svg').selectAll('*').remove();
    
    const svg = d3.select('#tree-svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create container group
    const g = svg.append('g');
    
    // Draw links (relationships)
    relationships.forEach(rel => {
        if (rel.type === 'parentChild') {
            const parent = positions[rel.parentId];
            const child = positions[rel.childId];
            
            if (parent && child) {
                g.append('line')
                    .attr('class', 'link parent-child-link')
                    .attr('x1', parent.x)
                    .attr('y1', parent.y)
                    .attr('x2', child.x)
                    .attr('y2', child.y);
            }
        } else if (rel.type === 'spouse') {
            const [p1, p2] = rel.people;
            const person1 = positions[p1];
            const person2 = positions[p2];
            
            if (person1 && person2) {
                // Draw curved line for spouses
                const midX = (person1.x + person2.x) / 2;
                const midY = Math.min(person1.y, person2.y) - 30;
                
                const path = d3.path();
                path.moveTo(person1.x, person1.y);
                path.quadraticCurveTo(midX, midY, person2.x, person2.y);
                
                g.append('path')
                    .attr('class', 'link spouse-link')
                    .attr('d', path.toString())
                    .attr('fill', 'none');
            }
        }
    });
    
    // Draw nodes
    Object.values(positions).forEach(({ x, y, node }) => {
        // Get person data - could be from node or peopleMap
        let person = peopleMap[node.id];
        if (!person && node.name) {
            // If it's a spouse node that wasn't in the main structure
            person = {
                id: node.id,
                name: node.name,
                gender: node.gender,
                aliases: node.aliases || [],
                birthYear: node.birthYear,
                deathYear: node.deathYear,
                notes: null
            };
        }
        if (!person) return;
        
        const isRoot = node.id === rootPersonId;
        const genderClass = person.gender === 'M' ? 'male' : 
                           person.gender === 'F' ? 'female' : 'other';
        
        const nodeGroup = g.append('g')
            .attr('class', `node ${genderClass} ${isRoot ? 'root' : ''}`)
            .attr('transform', `translate(${x}, ${y})`)
            .on('click', () => showPersonDetails(person));
        
        // Draw circle
        nodeGroup.append('circle')
            .attr('r', isRoot ? nodeRadius + 5 : nodeRadius);
        
        // Draw label
        const labelY = nodeRadius + 20;
        nodeGroup.append('text')
            .attr('y', labelY)
            .text(person.name)
            .attr('class', 'node-label');
    });
    
    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            currentZoomTransform = event.transform;
            updateZoomDisplay(event.transform.k);
        });
    
    svg.call(zoom);
    
    // Initialize zoom controls
    initZoomControls(zoom, svg);
}

// Global variable to track current zoom transform
let currentZoomTransform = d3.zoomIdentity;

// Initialize zoom controls
function initZoomControls(zoomBehavior, svg) {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    
    if (!zoomInBtn || !zoomOutBtn || !zoomResetBtn) return;
    
    function updateZoomDisplay(scale) {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(scale * 100) + '%';
        }
    }
    
    function zoomTo(scale) {
        const container = svg.node().getBoundingClientRect();
        const centerX = container.width / 2;
        const centerY = container.height / 2;
        
        currentZoomTransform = d3.zoomIdentity
            .translate(centerX, centerY)
            .scale(scale)
            .translate(-centerX, -centerY);
        
        svg.transition()
            .duration(200)
            .call(zoomBehavior.transform, currentZoomTransform);
    }
    
    zoomInBtn.addEventListener('click', () => {
        const newScale = Math.min(currentZoomTransform.k * 1.2, 3);
        zoomTo(newScale);
    });
    
    zoomOutBtn.addEventListener('click', () => {
        const newScale = Math.max(currentZoomTransform.k / 1.2, 0.3);
        zoomTo(newScale);
    });
    
    zoomResetBtn.addEventListener('click', () => {
        zoomTo(1);
    });
    
    // Initialize display
    updateZoomDisplay(1);
}

// Update zoom display
function updateZoomDisplay(scale) {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(scale * 100) + '%';
    }
}

// Show person details
function showPersonDetails(person) {
    const detailsDiv = document.getElementById('person-details');
    const nameDiv = document.getElementById('person-name');
    const infoDiv = document.getElementById('person-info');
    
    detailsDiv.classList.remove('hidden');
    nameDiv.textContent = person.name;
    
    let html = '';
    
    if (person.aliases && person.aliases.length > 0) {
        html += `<div class="info-item"><strong>Aliases</strong><span>${person.aliases.join(', ')}</span></div>`;
    }
    
    if (person.gender) {
        html += `<div class="info-item"><strong>Gender</strong><span>${person.gender}</span></div>`;
    }
    
    if (person.birthYear) {
        html += `<div class="info-item"><strong>Birth Year</strong><span>${person.birthYear}</span></div>`;
    }
    
    if (person.deathYear) {
        html += `<div class="info-item"><strong>Death Year</strong><span>${person.deathYear}</span></div>`;
    }
    
    if (person.notes) {
        html += `<div class="info-item"><strong>Notes</strong><span>${person.notes}</span></div>`;
    }
    
    infoDiv.innerHTML = html || '<div class="info-item">No additional information available.</div>';
}

// Also log that script loaded
console.log('Tree visualization script loaded');
console.log('Document ready state:', document.readyState);

// Initialize theme
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    if (!themeToggle || !themeIcon) return;
    
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('family-tree-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme, themeIcon);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('family-tree-theme', newTheme);
        updateThemeIcon(newTheme, themeIcon);
    });
}

function updateThemeIcon(theme, iconElement) {
    if (theme === 'dark') {
        iconElement.textContent = '☀️';
        iconElement.title = 'Switch to Light Mode';
    } else {
        iconElement.textContent = '🌙';
        iconElement.title = 'Switch to Dark Mode';
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    console.log('Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing...');
        initTheme();
        init();
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing immediately...');
    initTheme();
    init();
}

