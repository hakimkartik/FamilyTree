// Global variables
let treeData = null;
let peopleMap = {};
let relationships = [];
let rootPersonId = null;
let collapsedNodes = new Set(); // Track which nodes are collapsed

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

        // Reset collapsed nodes when loading new data
        resetCollapsedNodes();

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
            notes: person.notes,
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
                            notes: spouse.notes,
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
            notes: person.notes,
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
                // Use buildNodeDown to fetch the full subtree for this sibling!
                // This ensures cousins and distant relatives are included.
                const siblingNode = buildNodeDown(siblingId, visited, level);
                if (siblingNode) {
                    node.siblings.push(siblingNode);
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
                            notes: spouse.notes,
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
        notes: rootPerson.notes,
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
            // Use buildNodeDown for root siblings too
            // Note: visitedDown is used here to match the downward traversal context
            // But we need to use a visited set that accounts for what we've seen.
            // Actually, root.siblings are lateral.
            // Let's use buildNodeDown but be careful about the visited set.
            // Since buildNodeDown checks visited, we should pass the global visited set if we had one?
            // Here we have visitedDown and visitedUp.
            // Let's use visitedDown as they are effectively downward branches from the parent level.
            const siblingNode = buildNodeDown(siblingId, visitedDown, 0);
            if (siblingNode) {
                root.siblings.push(siblingNode);
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
                    notes: spouse.notes,
                    level: 0,
                    directDescendantsCount: countDirectDescendants(spouseId) // Add direct descendants count
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

        // If this node is collapsed, don't process its children or descendants
        if (collapsedNodes.has(node.id)) {
            return;
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
                            notes: spouse.notes,
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
                            notes: sibling.notes,
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
                                        notes: spouse.notes,
                                        level: level
                                    });
                                }
                            }
                        });


                        // Process children of siblings (nephews/nieces/cousins) using recursion
                        // Only process if the sibling is not collapsed
                        if (sibling.children && sibling.children.length > 0 && !collapsedNodes.has(sibling.id)) {
                            sibling.children.forEach(child => collectNodes(child, level + 1));
                        }
                    }
                }
            });
        }

        // Process children (downward) - only if the current node is not collapsed
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
        .attr('width', '100%')
        .attr('height', '100%');

    // Define Gradients - NATURE THEME
    const defs = svg.append("defs");

    // Male Gradient - Sky Blue
    const maleGradient = defs.append("linearGradient")
        .attr("id", "maleGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
    maleGradient.append("stop").attr("offset", "0%").attr("stop-color", "#4FC3F7"); // Light Blue
    maleGradient.append("stop").attr("offset", "100%").attr("stop-color", "#039BE5"); // Darker Blue

    // Female Gradient - Pink
    const femaleGradient = defs.append("linearGradient")
        .attr("id", "femaleGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
    femaleGradient.append("stop").attr("offset", "0%").attr("stop-color", "#F48FB1"); // Light Pink
    femaleGradient.append("stop").attr("offset", "100%").attr("stop-color", "#E91E63"); // Darker Pink

    // Other Gradient
    const otherGradient = defs.append("linearGradient")
        .attr("id", "otherGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
    otherGradient.append("stop").attr("offset", "0%").attr("stop-color", "#d4e157");
    otherGradient.append("stop").attr("offset", "100%").attr("stop-color", "#c0ca33");


    // Create container group
    const g = svg.append('g');

    // Draw links (relationships)
    relationships.forEach((rel, index) => {
        if (rel.type === 'parentChild') {
            const parent = positions[rel.parentId];
            const child = positions[rel.childId];

            // Only draw the link if both parent and child are present in positions
            // and the parent is not collapsed (since if parent is collapsed, child won't be in positions)
            if (parent && child && !collapsedNodes.has(rel.parentId)) {
                // Organic curve generator
                const linkGen = d3.linkVertical()
                    .x(d => d.x)
                    .y(d => d.y);

                const linkData = {
                    source: { x: parent.x, y: parent.y + (nodeRadius * 0.5) }, // Start slightly below center
                    target: { x: child.x, y: child.y - (nodeRadius * 0.5) }   // End slightly above center
                };

                const path = g.append('path')
                    .attr('class', 'link parent-child-link')
                    .attr('data-parent', rel.parentId) // Add IDs for highlighting
                    .attr('data-child', rel.childId)
                    .attr('d', linkGen(linkData))
                    .attr('stroke', '#795548')
                    .attr('stroke-width', 2)
                    .attr('fill', 'none')
                    .attr('stroke-dasharray', function () { return this.getTotalLength(); })
                    .attr('stroke-dashoffset', function () { return this.getTotalLength(); });

                // Animate path
                path.transition()
                    .duration(1500)
                    .delay(index * 20)
                    .ease(d3.easeCubicOut)
                    .attr('stroke-dashoffset', 0);
            }
        } else if (rel.type === 'spouse') {
            const [p1, p2] = rel.people;
            const person1 = positions[p1];
            const person2 = positions[p2];

            // Only draw spouse link if both people are present in positions
            if (person1 && person2) {
                // Draw curved line for spouses
                const midX = (person1.x + person2.x) / 2;
                const midY = Math.min(person1.y, person2.y) - 40; // Higher arc for more "bridge" look

                const pathData = d3.path();
                pathData.moveTo(person1.x, person1.y);
                pathData.quadraticCurveTo(midX, midY, person2.x, person2.y);

                const path = g.append('path')
                    .attr('class', 'link spouse-link')
                    .attr('data-p1', p1) // Add IDs for highlighting
                    .attr('data-p2', p2)
                    .attr('d', pathData.toString())
                    .attr('stroke', '#a1887f')
                    .attr('fill', 'none')
                    .attr('stroke-dasharray', function () { return this.getTotalLength(); })
                    .attr('stroke-dashoffset', function () { return this.getTotalLength(); });

                path.transition()
                    .duration(1500)
                    .delay(index * 20)
                    .ease(d3.easeCubicOut)
                    .attr('stroke-dashoffset', 0);
            }
        }
    });

    // Create Tooltip if it doesn't exist
    let tooltip = d3.select("body").select(".cloud-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "cloud-tooltip");
    }

    // Handle Mouse Events for Interaction
    function handleMouseOver(event, d) {
        // 1. Tooltip Logic
        const person = peopleMap[d.id];
        if (!person && d.node) person = peopleMap[d.node.id]; // Fallback depending on data binding
        // Actually d is just the data bound, which is... we didn't bind data yet explicitly in the loop
        // In the loop below: Object.values(positions).forEach...
        // We aren't using d3.data().enter(). So 'd' might be the MouseEvent or undefined if we don't bind.
        // We will bind data to the group to make this easier.
    }

    // Draw nodes
    Object.values(positions).forEach(({ x, y, node }, index) => {
        // Get person data - could be from node or peopleMap
        let person = peopleMap[node.id];
        if (!person && node.name) {
            person = { id: node.id, name: node.name, gender: node.gender, aliases: node.aliases || [], birthYear: node.birthYear, deathYear: node.deathYear, notes: null };
        }
        if (!person) return;

        const isRoot = node.id === rootPersonId;
        const genderClass = person.gender === 'M' ? 'male' :
            person.gender === 'F' ? 'female' : 'other';

        const nodeGroup = g.append('g')
            .data([person]) // Bind data for easier event handling
            .attr('class', `node ${genderClass} ${isRoot ? 'root' : ''} ${collapsedNodes.has(person.id) ? 'collapsed' : ''}`)
            .attr('id', `node-${person.id}`) // Add ID for easy selection
            .attr('transform', `translate(${x}, ${y}) scale(0)`)
            .on('click', function(event, d) {
                // Check if shift key is pressed to show person details instead of toggling collapse
                if (event.shiftKey) {
                    showPersonDetails(person);
                } else {
                    toggleNodeCollapse(person.id);
                }
            })
            .on('mouseover', function (event, d) {
                // Dim Tree
                svg.classed('tree-dimmed', true);

                // Highlight Current Node
                d3.select(this).classed('highlighted', true);

                // Find Connected Links and Nodes
                const connectedPersonIds = new Set();

                // Highlight Parent-Child Links
                svg.selectAll('.parent-child-link').each(function () {
                    const link = d3.select(this);
                    const p = link.attr('data-parent');
                    const c = link.attr('data-child');

                    if (p === d.id || c === d.id) {
                        link.classed('highlighted', true);
                        connectedPersonIds.add(p);
                        connectedPersonIds.add(c);
                    }
                });

                // Highlight Spouse Links
                svg.selectAll('.spouse-link').each(function () {
                    const link = d3.select(this);
                    const p1 = link.attr('data-p1');
                    const p2 = link.attr('data-p2');

                    if (p1 === d.id || p2 === d.id) {
                        link.classed('highlighted', true);
                        connectedPersonIds.add(p1);
                        connectedPersonIds.add(p2);
                    }
                });

                // Highlight Connected Nodes
                connectedPersonIds.forEach(id => {
                    svg.select(`#node-${id}`).classed('highlighted', true);
                });

                // Show Cloud Tooltip
                const age = person.birthYear ? (person.deathYear ? person.deathYear - person.birthYear : new Date().getFullYear() - person.birthYear) : 'Unknown';
                const aliases = person.aliases && person.aliases.length > 0 ? person.aliases.join(', ') : 'None';
                // Use person.notes here
                const notes = person.notes ? person.notes : null;

                let content = `<div class="tooltip-name">${person.name}</div>`;
                if (person.birthYear) content += `<div class="tooltip-detail"><span>Born</span> <span>${person.birthYear}</span></div>`;
                if (person.deathYear) content += `<div class="tooltip-detail"><span>Died</span> <span>${person.deathYear}</span></div>`;
                if (person.birthYear) content += `<div class="tooltip-detail"><span>Age</span> <span>${age}</span></div>`;
                if (person.aliases && person.aliases.length) content += `<div class="tooltip-detail"><span>Aliases</span> <span>${aliases}</span></div>`;
                if (notes) content += `<div class="tooltip-detail note"><span>Notes</span> <span>${notes}</span></div>`;
                
                // Add indicator for collapsed state
                if (collapsedNodes.has(person.id)) {
                    content += `<div class="tooltip-detail"><span>Status</span> <span>Collapsed</span></div>`;
                }

                // Calculate position relative to the node, not the mouse
                const bounds = this.getBoundingClientRect();
                const scrollX = window.scrollX || window.pageXOffset;
                const scrollY = window.scrollY || window.pageYOffset;

                // Position: Center horizontally, Above the node
                const tooltipX = scrollX + bounds.left + (bounds.width / 2);
                const tooltipY = scrollY + bounds.top - 15; // 15px gap

                tooltip.html(content)
                    .style("left", tooltipX + "px")
                    .style("top", tooltipY + "px")
                    .style("transform", "translate(-50%, -100%)") // Center horizontally and move up
                    .classed("show", true);
            })
            // Remove mousemove handler since we are fixing it to the node
            .on('mousemove', null)
            .on('mouseout', function () {
                // Reset Visuals
                svg.classed('tree-dimmed', false);
                svg.selectAll('.node').classed('highlighted', false);
                svg.selectAll('.link').classed('highlighted', false);

                // Hide Tooltip
                tooltip.classed("show", false);
            });

        // Create content wrapper for safe animation
        const nodeContent = nodeGroup.append('g')
            .attr('class', 'node-content');

        // Draw circle
        nodeContent.append('circle')
            .attr('r', isRoot ? nodeRadius + 10 : nodeRadius) // Slightly larger
            .attr('fill', d => {
                if (person.gender === 'M') return 'url(#maleGradient)';
                if (person.gender === 'F') return 'url(#femaleGradient)';
                return 'url(#otherGradient)';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', collapsedNodes.has(person.id) ? '5,5' : 'none'); // Dashed border for collapsed nodes

        // Draw label
        const labelY = isRoot ? nodeRadius + 35 : nodeRadius + 25;
        nodeContent.append('text')
            .attr('y', labelY)
            .text(person.name)
            .style('opacity', 0); // Start invisible

        // Animate Node Entry
        nodeGroup.transition()
            .duration(800)
            .delay(index * 50 + 500) // Start after links begin
            .ease(d3.easeBackOut)
            .attr('transform', `translate(${x}, ${y}) scale(1)`);

        // Animate Text Entry
        nodeGroup.select('text')
            .transition()
            .duration(800)
            .delay(index * 50 + 800)
            .style('opacity', 1);
    });

    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4]) // Allow wider zoom range (keeping original to maintain compatibility)
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            currentZoomTransform = event.transform;
            updateZoomDisplay(event.transform.k);
        });

    svg.call(zoom);

    // Center the tree initially - focus on Root
    const initialTransform = d3.zoomIdentity
        .translate(width / 2, height / 2) // Move to center
        .scale(0.45) // Start at 45% zoom level
        .translate(-positions[rootPersonId].x, -positions[rootPersonId].y); // Center on root person

    svg.call(zoom.transform, initialTransform);
    currentZoomTransform = initialTransform;


    // Initialize zoom controls
    initZoomControls(zoom, svg);
    
    // Initialize search functionality
    initSearchFunctionality();
}

// Global variable to track current zoom transform
let currentZoomTransform = d3.zoomIdentity;

// Initialize search functionality
function initSearchFunctionality() {
    // Create search container if it doesn't exist
    let searchContainer = document.getElementById('search-container');
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'search-container';
        searchContainer.style.position = 'absolute';
        searchContainer.style.top = '15px';
        searchContainer.style.left = '15px'; // Positioned on the left side
        searchContainer.style.right = 'auto'; // Override any right positioning
        searchContainer.style.zIndex = '100';
        searchContainer.style.backgroundColor = 'var(--bg-secondary)';
        searchContainer.style.padding = '8px 12px';
        searchContainer.style.borderRadius = '8px';
        searchContainer.style.boxShadow = '0 2px 8px var(--shadow-light)';
        searchContainer.style.display = 'flex';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.gap = '5px';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.placeholder = 'Search person...';
        searchInput.style.padding = '5px 8px';
        searchInput.style.border = '1px solid var(--border-color)';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = '14px';
        searchInput.style.width = '150px';
        
        const searchButton = document.createElement('button');
        searchButton.id = 'search-button';
        searchButton.textContent = '🔍';
        searchButton.style.border = 'none';
        searchButton.style.background = 'transparent';
        searchButton.style.cursor = 'pointer';
        searchButton.style.fontSize = '16px';
        
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchButton);
        
        document.getElementById('tree-container').appendChild(searchContainer);
        
        // Add event listeners
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchButton.addEventListener('click', performSearch);
    }
}

// Perform search and highlight matching nodes
function performSearch() {
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
    
    if (!searchTerm) {
        // Clear highlights if search is empty
        clearHighlights();
        // Also hide suggestions
        hideSuggestions();
        return;
    }
    
    // Clear previous highlights
    clearHighlights();
    
    // Find matching nodes
    const matchingNodes = [];
    Object.keys(peopleMap).forEach(personId => {
        const person = peopleMap[personId];
        if (person.name.toLowerCase().includes(searchTerm) || 
            (person.aliases && person.aliases.some(alias => alias.toLowerCase().includes(searchTerm)))) {
            matchingNodes.push(personId);
        }
    });
    
    // Highlight matching nodes
    matchingNodes.forEach(personId => {
        const nodeElement = document.getElementById(`node-${personId}`);
        if (nodeElement) {
            // Add highlight class
            nodeElement.classList.add('search-highlight');
            
            // Add animation effect
            const circle = nodeElement.querySelector('circle');
            if (circle) {
                // Create animation effect
                d3.select(circle)
                    .transition()
                    .duration(200)
                    .attr('r', nodeRadius + 15) // Make slightly bigger
                    .transition()
                    .duration(200)
                    .attr('r', nodeRadius + 5); // Then slightly bigger than normal
                
                // Add pulsing effect
                d3.select(circle)
                    .attr('stroke-width', 5)
                    .attr('stroke', '#FFD700'); // Gold color for highlight
            }
        }
    });
    
    // If only one match, center the view on it
    if (matchingNodes.length === 1) {
        const personId = matchingNodes[0];
        // Get the position of the matched node from positions map
        const positionInfo = positions[personId];
        if (positionInfo) {
            // Get the SVG element and its current transform
            const svgElement = d3.select('#tree-svg');
            const svg = svgElement.node();
            const container = svg.getBoundingClientRect();
            
            // Calculate the transform to center on the node
            const centerX = container.width / 2;
            const centerY = container.height / 2;
            
            const newTransform = d3.zoomIdentity
                .translate(centerX, centerY)
                .scale(currentZoomTransform.k)
                .translate(-positionInfo.x, -positionInfo.y);
            
            // Apply the transform with smooth transition
            svgElement
                .select('g') // Select the main group containing all nodes
                .transition()
                .duration(750)
                .call(d3.select(svg).transition().duration(750), newTransform);
                
            // Update the global transform variable
            currentZoomTransform = newTransform;
        }
    }
}

// Initialize search functionality with autocomplete
function initSearchFunctionality() {
    // Create search container if it doesn't exist
    let searchContainer = document.getElementById('search-container');
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'search-container';
        searchContainer.style.position = 'absolute';
        searchContainer.style.top = '15px';
        searchContainer.style.left = '15px'; // Positioned on the left side
        searchContainer.style.right = 'auto'; // Override any right positioning
        searchContainer.style.zIndex = '100';
        searchContainer.style.backgroundColor = 'var(--bg-secondary)';
        searchContainer.style.padding = '8px 12px';
        searchContainer.style.borderRadius = '8px';
        searchContainer.style.boxShadow = '0 2px 8px var(--shadow-light)';
        searchContainer.style.display = 'flex';
        searchContainer.style.flexDirection = 'column';
        searchContainer.style.alignItems = 'stretch';
        searchContainer.style.gap = '5px';
        
        const searchInputWrapper = document.createElement('div');
        searchInputWrapper.style.display = 'flex';
        searchInputWrapper.style.alignItems = 'center';
        searchInputWrapper.style.gap = '5px';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.placeholder = 'Search person...';
        searchInput.style.padding = '5px 8px';
        searchInput.style.border = '1px solid var(--border-color)';
        searchInput.style.borderRadius = '4px';
        searchInput.style.fontSize = '14px';
        searchInput.style.width = '150px';
        searchInput.style.outline = 'none';
        
        const searchButton = document.createElement('button');
        searchButton.id = 'search-button';
        searchButton.textContent = '🔍';
        searchButton.style.border = 'none';
        searchButton.style.background = 'transparent';
        searchButton.style.cursor = 'pointer';
        searchButton.style.fontSize = '16px';
        
        searchInputWrapper.appendChild(searchInput);
        searchInputWrapper.appendChild(searchButton);
        
        // Create suggestions container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'suggestions-container';
        suggestionsContainer.style.position = 'absolute';
        suggestionsContainer.style.top = '45px';
        suggestionsContainer.style.left = '0';
        suggestionsContainer.style.width = '100%';
        suggestionsContainer.style.maxHeight = '200px';
        suggestionsContainer.style.overflowY = 'auto';
        suggestionsContainer.style.backgroundColor = 'var(--bg-secondary)';
        suggestionsContainer.style.border = '1px solid var(--border-color)';
        suggestionsContainer.style.borderRadius = '4px';
        suggestionsContainer.style.boxShadow = '0 4px 12px var(--shadow-light)';
        suggestionsContainer.style.display = 'none';
        suggestionsContainer.style.zIndex = '101';
        
        searchContainer.appendChild(searchInputWrapper);
        searchContainer.appendChild(suggestionsContainer);
        
        document.getElementById('tree-container').appendChild(searchContainer);
        
        // Add event listeners
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchInput.addEventListener('focus', function() {
            if (this.value.trim() !== '') {
                showSuggestions(this.value);
            }
        });
        
        searchInput.addEventListener('blur', function() {
            // Delay hiding suggestions to allow clicking on them
            setTimeout(hideSuggestions, 200);
        });
        
        searchButton.addEventListener('click', performSearch);
    }
}

// Handle search input for autocomplete
function handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm === '') {
        hideSuggestions();
        clearHighlights();
        return;
    }
    
    showSuggestions(searchTerm);
}

// Show autocomplete suggestions
function showSuggestions(searchTerm) {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (!suggestionsContainer) return;
    
    // Find matching names
    const matches = [];
    Object.keys(peopleMap).forEach(personId => {
        const person = peopleMap[personId];
        const fullName = person.name.toLowerCase();
        const aliases = person.aliases ? person.aliases.map(a => a.toLowerCase()) : [];
        
        // Check if name or any alias matches
        if (fullName.includes(searchTerm.toLowerCase()) || 
            aliases.some(alias => alias.includes(searchTerm.toLowerCase()))) {
            matches.push({
                id: personId,
                name: person.name,
                aliases: person.aliases || []
            });
        }
    });
    
    // Limit to top 10 matches
    const topMatches = matches.slice(0, 10);
    
    if (topMatches.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    // Create suggestion items
    suggestionsContainer.innerHTML = '';
    topMatches.forEach(match => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.style.padding = '8px 12px';
        suggestionItem.style.cursor = 'pointer';
        suggestionItem.style.borderBottom = '1px solid var(--border-color)';
        suggestionItem.style.fontSize = '14px';
        suggestionItem.style.color = 'var(--text-primary)';
        
        // Highlight matching text
        let displayName = match.name;
        if (match.aliases.length > 0) {
            displayName += ` (${match.aliases.join(', ')})`;
        }
        
        // Highlight the matching part
        const searchTermLower = searchTerm.toLowerCase();
        const nameLower = displayName.toLowerCase();
        const matchIndex = nameLower.indexOf(searchTermLower);
        
        if (matchIndex !== -1) {
            const before = displayName.substring(0, matchIndex);
            const matched = displayName.substring(matchIndex, matchIndex + searchTerm.length);
            const after = displayName.substring(matchIndex + searchTerm.length);
            
            suggestionItem.innerHTML = `
                <span>${before}<strong>${matched}</strong>${after}</span>
            `;
        } else {
            suggestionItem.textContent = displayName;
        }
        
        suggestionItem.addEventListener('mousedown', function() {
            // Set the input value to the selected suggestion
            document.getElementById('search-input').value = match.name;
            suggestionsContainer.style.display = 'none';
            
            // Highlight the selected person
            clearHighlights();
            const nodeElement = document.getElementById(`node-${match.id}`);
            if (nodeElement) {
                nodeElement.classList.add('search-highlight');
                
                const circle = nodeElement.querySelector('circle');
                if (circle) {
                    d3.select(circle)
                        .transition()
                        .duration(200)
                        .attr('r', nodeRadius + 15)
                        .transition()
                        .duration(200)
                        .attr('r', nodeRadius + 5);
                    
                    d3.select(circle)
                        .attr('stroke-width', 5)
                        .attr('stroke', '#FFD700');
                }
            }
            
            // Center the view on the selected person
            const positionInfo = positions[match.id];
            if (positionInfo) {
                const svgElement = d3.select('#tree-svg');
                const svg = svgElement.node();
                
                const centerX = svg.clientWidth / 2;
                const centerY = svg.clientHeight / 2;
                
                const newTransform = d3.zoomIdentity
                    .translate(centerX, centerY)
                    .scale(currentZoomTransform.k)
                    .translate(-positionInfo.x, -positionInfo.y);
                
                svgElement
                    .select('g')
                    .transition()
                    .duration(750)
                    .call(d3.select(svg).transition().duration(750), newTransform);
                    
                currentZoomTransform = newTransform;
            }
        });
        
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Hide suggestions
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Clear all highlights
function clearHighlights() {
    // Remove highlight classes and reset styles
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.classList.remove('search-highlight');
        
        // Reset circle properties
        const circle = el.querySelector('circle');
        if (circle) {
            // Use D3 to properly reset the animated properties
            d3.select(circle)
                .interrupt() // Stop any ongoing transitions
                .attr('r', function(d) {
                    // Determine if this is a root node to set the correct radius
                    const nodeId = this.parentNode.id.replace('node-', '');
                    return peopleMap[nodeId] && nodeId === rootPersonId ? nodeRadius + 10 : nodeRadius;
                })
                .attr('stroke-width', 3)
                .attr('stroke', '#fff');
        }
    });
}

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
        const newScale = Math.min(currentZoomTransform.k + 0.1, 3); // Increment by 10%
        zoomTo(newScale);
    });

    zoomOutBtn.addEventListener('click', () => {
        const newScale = Math.max(currentZoomTransform.k - 0.1, 0.1); // Decrement by 10%, minimum 10%
        zoomTo(newScale);
    });

    zoomResetBtn.addEventListener('click', () => {
        zoomTo(1);
    });

    // Initialize display
    updateZoomDisplay(0.45); // Start at 45%
}

// Update zoom display
function updateZoomDisplay(scale) {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(scale * 100) + '%';
    }
}

// Toggle node collapse/expand
function toggleNodeCollapse(nodeId) {
    if (collapsedNodes.has(nodeId)) {
        collapsedNodes.delete(nodeId);
    } else {
        collapsedNodes.add(nodeId);
    }
    
    // Re-render the tree to reflect the collapse/expand state
    renderTree();
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

// Generate PNG Functionality
async function generatePNG() {
    const svgElement = document.getElementById('tree-svg');
    const { width, height } = svgElement.getBoundingClientRect();

    // 1. Get the current SVG content
    const serializer = new XMLSerializer();
    const clone = svgElement.cloneNode(true);

    // 2. Embed Styles (Crucial for correct rendering)
    const styleSheet = Array.from(document.styleSheets).find(s => s.href && s.href.includes('styles.css'));
    let cssText = "";
    if (styleSheet) {
        try {
            cssText = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch (e) {
            console.warn("Could not access stylesheet rules", e);
        }
    }

    const styleElement = document.createElement('style');
    styleElement.textContent = cssText;
    clone.insertBefore(styleElement, clone.firstChild);

    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    // 3. Serialize and Draw
    const svgString = serializer.serializeToString(clone);
    const img = new Image();

    // Create Blob URL
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // retina resolution
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // Draw Background (Simulated based on theme)
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            ctx.fillStyle = '#1b262c'; // Dark theme fallback base
            ctx.fillRect(0, 0, width, height); // Fill background
        } else {
            ctx.fillStyle = '#f0f7ff'; // Light theme fallback base
            // For transparent background in light mode, maybe skip fillRect or use white
            // But usually nice to have a background
            ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Trigger Download
        const a = document.createElement('a');
        a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    img.src = url;
}

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

        // Attach PNG listener here to be safe
        const pngBtn = document.getElementById('generate-png-btn');
        if (pngBtn) pngBtn.addEventListener('click', generatePNG);
    });
} else {
    // DOM is already loaded
    console.log('DOM already loaded, initializing immediately...');
    initTheme();
    init();

    // Attach PNG listener here too
    const pngBtn = document.getElementById('generate-png-btn');
    if (pngBtn) pngBtn.addEventListener('click', generatePNG);
}

// Function to reset collapsed nodes when loading new data
function resetCollapsedNodes() {
    collapsedNodes.clear();
}
