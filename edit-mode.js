// Edit Mode Functionality
let originalTreeData = null;

// Initialize edit mode
function initEditMode() {
    // Store original data for reload
    if (treeData) {
        originalTreeData = JSON.parse(JSON.stringify(treeData));
    }

    // Initialize autocomplete fields
    if (typeof initAllAutocompletes === 'function') {
        initAllAutocompletes();
    }

    // Mode switching
    const viewModeBtn = document.getElementById('view-mode');
    const editModeBtn = document.getElementById('edit-mode');
    const viewPanel = document.getElementById('view-panel');
    const editPanel = document.getElementById('edit-panel');

    viewModeBtn.addEventListener('click', () => {
        viewModeBtn.classList.add('active');
        editModeBtn.classList.remove('active');
        viewPanel.classList.remove('hidden');
        editPanel.classList.add('hidden');
    });

    editModeBtn.addEventListener('click', () => {
        editModeBtn.classList.add('active');
        viewModeBtn.classList.remove('active');
        editPanel.classList.remove('hidden');
        viewPanel.classList.add('hidden');
        updateEditForms();
    });

    // Enable edit mode button
    editModeBtn.disabled = false;

    // Relationship tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.getElementById('add-parent-child-form').classList.toggle('hidden', tab !== 'parent-child');
            document.getElementById('add-spouse-form').classList.toggle('hidden', tab !== 'spouse');
        });
    });

    // Form submissions
    // editBtn listener removed as it was duplicating functionality and referencing undefined toggleEditMode


    // Forms
    const addParentChildForm = document.getElementById('add-parent-child-form');
    if (addParentChildForm) {
        addParentChildForm.addEventListener('submit', handleAddParentChild);
    }

    const addSpouseForm = document.getElementById('add-spouse-form');
    if (addSpouseForm) {
        addSpouseForm.addEventListener('submit', handleAddSpouse);
    }

    const addPersonForm = document.getElementById('add-person-form');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPerson); // Ensure this handler exists or was added
    }

    const editPersonForm = document.getElementById('edit-person-form');
    if (editPersonForm) {
        editPersonForm.addEventListener('submit', handleUpdatePerson); // Changed to handleUpdatePerson as per existing code
    }

    // Save Buttons - Debugging & Robust Attachment
    const saveServerBtn = document.getElementById('save-server-btn');
    if (saveServerBtn) {
        console.log('Attaching Save to Server listener');
        const newBtn = saveServerBtn.cloneNode(true);
        saveServerBtn.parentNode.replaceChild(newBtn, saveServerBtn);
        newBtn.addEventListener('click', (e) => {
            console.log('Save to Server clicked');
            saveToServer();
        });
    } else {
        console.error('Save Server Button NOT FOUND');
    }

    const downloadJsonBtn = document.getElementById('download-json-btn');
    if (downloadJsonBtn) {
        console.log('Attaching Download JSON listener');
        const newBtn = downloadJsonBtn.cloneNode(true);
        downloadJsonBtn.parentNode.replaceChild(newBtn, downloadJsonBtn);
        newBtn.addEventListener('click', (e) => {
            console.log('Download JSON clicked');
            downloadJSON();
        });
    } else {
        console.error('Download JSON Button NOT FOUND');
    }

    const reloadBtn = document.getElementById('reload-data-btn');
    if (reloadBtn) {
        const newBtn = reloadBtn.cloneNode(true);
        reloadBtn.parentNode.replaceChild(newBtn, reloadBtn);
        newBtn.addEventListener('click', reloadOriginalData);
    }

    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            document.querySelectorAll('.edit-form-section').forEach(section => {
                section.classList.remove('active');
            });
            // Assuming sections are named like 'parent-child-section', 'spouse-section', etc.
            const targetSection = document.getElementById(target + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
            } else {
                // Fallback for existing forms if sections are not defined
                document.getElementById('add-parent-child-form').classList.toggle('hidden', target !== 'parent-child');
                document.getElementById('add-spouse-form').classList.toggle('hidden', target !== 'spouse');
                document.getElementById('add-person-form').classList.toggle('hidden', target !== 'add-person'); // Assuming an 'add-person' tab
                document.getElementById('edit-person-form').classList.toggle('hidden', target !== 'edit-person'); // Assuming an 'edit-person' tab
            }
        });
    });

    // Auto-generate ID from name
    document.getElementById('person-name-input').addEventListener('input', (e) => {
        const nameInput = e.target;
        const idInput = document.getElementById('person-id-input');
        if (!idInput.value || idInput.dataset.autoGenerated === 'true') {
            const generatedId = generateIdFromName(nameInput.value);
            idInput.value = generatedId;
            idInput.dataset.autoGenerated = 'true';
        }
    });

    document.getElementById('person-id-input').addEventListener('input', (e) => {
        e.target.dataset.autoGenerated = 'false';
    });

    // --- NEW: Edit Existing Person Listeners ---

    // Initialize Autocomplete for Edit Search
    if (typeof initAutocomplete === 'function') {
        initAutocomplete('edit-search-input', 'edit-search-select', 'edit-search-results', (person) => {
            if (person && person.id) {
                const fullPersonData = peopleMap[person.id];
                loadPersonForEditing(fullPersonData);
            }
        });
    }

    // Handle Edit Form Submission
    const editForm = document.getElementById('edit-person-form');
    if (editForm) {
        editForm.addEventListener('submit', handleUpdatePerson);
    }

    // Handle Cancel Button
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('edit-person-form').classList.add('hidden');
            document.getElementById('edit-search-input').value = '';
            document.getElementById('edit-search-select').value = '';
        });
    }

    // Handle Delete Button
    const deleteBtn = document.getElementById('delete-person-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const personId = document.getElementById('edit-person-id').value;
            if (personId && confirm(`Are you sure you want to delete this person? This action cannot be undone.`)) {
                handleDeletePerson(personId);
                document.getElementById('edit-person-form').classList.add('hidden');
                document.getElementById('edit-search-input').value = '';
                document.getElementById('edit-search-select').value = '';
            }
        });
    }
}

// Load Person Data into Edit Form
function loadPersonForEditing(person) {
    document.getElementById('edit-person-form').classList.remove('hidden');
    document.getElementById('edit-person-id').value = person.id;
    document.getElementById('edit-person-name').value = person.name;
    document.getElementById('edit-person-gender').value = person.gender || 'M';
    document.getElementById('edit-person-aliases').value = person.aliases ? person.aliases.join(', ') : '';
    document.getElementById('edit-person-birth-year').value = person.birthYear || '';
    document.getElementById('edit-person-death-year').value = person.deathYear || '';
    document.getElementById('edit-person-notes').value = person.notes || '';

    // Scroll to form
    document.getElementById('edit-person-form').scrollIntoView({ behavior: 'smooth' });
}

// Handle Update Person
function handleUpdatePerson(e) {
    e.preventDefault();

    const id = document.getElementById('edit-person-id').value;
    const person = peopleMap[id];
    if (!person) return;

    // Update fields
    person.name = document.getElementById('edit-person-name').value.trim();
    person.gender = document.getElementById('edit-person-gender').value;

    const aliasesStr = document.getElementById('edit-person-aliases').value.trim();
    person.aliases = aliasesStr ? aliasesStr.split(',').map(a => a.trim()).filter(a => a) : [];

    const bYear = document.getElementById('edit-person-birth-year').value.trim();
    person.birthYear = bYear ? parseInt(bYear) : null;

    const dYear = document.getElementById('edit-person-death-year').value.trim();
    person.deathYear = dYear ? parseInt(dYear) : null;

    person.notes = document.getElementById('edit-person-notes').value.trim() || null;

    treeData.meta.modified = new Date().toISOString();

    // Find index and update treeData.people array as well (peopleMap is reference, but safe to be sure)
    const index = treeData.people.findIndex(p => p.id === id);
    if (index !== -1) treeData.people[index] = person;

    renderTree();
    showMessage('edit-person-form', `Updated ${person.name} successfully!`, 'success');

    // Clear search
    document.getElementById('edit-search-input').value = '';
    document.getElementById('edit-person-form').classList.add('hidden');
}

// Generate ID from name
function generateIdFromName(name) {
    if (!name) return '';
    let base = name.toLowerCase().replace(/\s+/g, '_');
    base = base.replace(/[^a-z0-9_]/g, '');

    // Check if ID exists
    let counter = 1;
    let finalId = base;
    while (peopleMap[finalId]) {
        finalId = `${base}_${counter}`;
        counter++;
    }

    return finalId;
}

// Update edit forms with current data
function updateEditForms() {
    updatePersonSelects();
}

// Update all person select dropdowns (now using autocomplete)
function updatePersonSelects() {
    // Autocomplete fields are updated automatically when peopleMap changes
    // No need to manually update them
}

// --- NEW: Edit Person Functions ---

function loadPersonForEditing(person) {
    if (!person) return;

    const form = document.getElementById('edit-person-form');
    form.classList.remove('hidden');

    document.getElementById('edit-person-id').value = person.id;
    document.getElementById('edit-person-name').value = person.name;
    document.getElementById('edit-person-gender').value = person.gender || 'M';
    document.getElementById('edit-person-aliases').value = person.aliases ? person.aliases.join(', ') : '';
    document.getElementById('edit-person-birth-year').value = person.birthYear || '';
    document.getElementById('edit-person-death-year').value = person.deathYear || '';
    document.getElementById('edit-person-notes').value = person.notes || '';

    // Smooth scroll to form to make it visible
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleUpdatePerson(e) {
    e.preventDefault();

    const id = document.getElementById('edit-person-id').value;
    const person = peopleMap[id];

    if (!person) {
        showMessage('edit-person-form', 'Error: Person not found!', 'error');
        return;
    }

    // Update fields from form
    person.name = document.getElementById('edit-person-name').value.trim();
    person.gender = document.getElementById('edit-person-gender').value;

    const aliasesStr = document.getElementById('edit-person-aliases').value.trim();
    person.aliases = aliasesStr ? aliasesStr.split(',').map(a => a.trim()).filter(a => a) : [];

    const bYear = document.getElementById('edit-person-birth-year').value.trim();
    person.birthYear = bYear ? parseInt(bYear) : null;

    const dYear = document.getElementById('edit-person-death-year').value.trim();
    person.deathYear = dYear ? parseInt(dYear) : null;

    person.notes = document.getElementById('edit-person-notes').value.trim() || null;

    // Update modification time
    treeData.meta.modified = new Date().toISOString();

    // Update array in treeData (peopleMap is already a reference to objects in this array, but good to be safe)
    // Since we modified the object directly via 'person', it is updated in the array too.

    // Re-render to show changes (preserving collapsed state)
    renderTree();

    showMessage('edit-person-form', `Updated ${person.name} successfully!`, 'success');

    // Reset and hide
    document.getElementById('edit-search-input').value = '';
    document.getElementById('edit-search-select').value = '';
    document.getElementById('edit-person-form').classList.add('hidden');
}

// Handle add person form submission
function handleAddPerson(e) {
    e.preventDefault();

    const name = document.getElementById('person-name-input').value.trim();
    if (!name) {
        showMessage('add-person-form', 'Name is required!', 'error');
        return;
    }

    let personId = document.getElementById('person-id-input').value.trim();
    if (!personId) {
        personId = generateIdFromName(name);
    }

    // Check if ID already exists
    if (peopleMap[personId]) {
        showMessage('add-person-form', `ID "${personId}" already exists. Please choose a different ID.`, 'error');
        return;
    }

    const gender = document.getElementById('person-gender').value || null;
    const aliasesStr = document.getElementById('person-aliases').value.trim();
    const aliases = aliasesStr ? aliasesStr.split(',').map(a => a.trim()).filter(a => a) : [];
    const birthYear = document.getElementById('person-birth-year').value.trim();
    const deathYear = document.getElementById('person-death-year').value.trim();
    const notes = document.getElementById('person-notes').value.trim() || null;

    const person = {
        id: personId,
        name: name,
        gender: gender,
        aliases: aliases,
        birthYear: birthYear ? parseInt(birthYear) : null,
        deathYear: deathYear ? parseInt(deathYear) : null,
        notes: notes
    };

    // Add to tree data
    treeData.people.push(person);
    peopleMap[personId] = person;
    treeData.meta.modified = new Date().toISOString();

    // Reset form
    document.getElementById('add-person-form').reset();
    document.getElementById('person-id-input').dataset.autoGenerated = 'true';

    // Update selects
    updatePersonSelects();

    // Re-render tree (preserving collapsed state)
    renderTree();

    showMessage('add-person-form', `Successfully added ${name}!`, 'success');
}

// Check for relationship cycles (e.g., making a child a parent of their parent)
function wouldCreateCycle(parentId, childId) {
    // Build a map of all parent-child relationships
    const parentMap = {};
    treeData.relationships.forEach(rel => {
        if (rel.type === 'parentChild') {
            if (!parentMap[rel.childId]) parentMap[rel.childId] = [];
            parentMap[rel.childId].push(rel.parentId);
        }
    });

    // Check if childId is an ancestor of parentId
    function isAncestor(ancestorId, descendantId) {
        if (ancestorId === descendantId) return true;
        const parents = parentMap[descendantId] || [];
        for (const parent of parents) {
            if (isAncestor(ancestorId, parent)) return true;
        }
        return false;
    }

    return isAncestor(childId, parentId);
}

// Handle add parent-child relationship
function handleAddParentChild(e) {
    e.preventDefault();

    const fatherId = document.getElementById('father-select').value;
    const motherId = document.getElementById('mother-select').value;
    const childId = document.getElementById('child-select').value;

    // At least one parent is required
    if ((!fatherId && !motherId) || !childId) {
        showMessage('add-parent-child-form', 'Please select at least one parent and a child.', 'error');
        return;
    }

    if ((fatherId === childId) || (motherId === childId)) {
        showMessage('add-parent-child-form', 'A parent cannot be the same as the child.', 'error');
        return;
    }

    if (fatherId === motherId && fatherId) {
        showMessage('add-parent-child-form', 'Father and mother cannot be the same person.', 'error');
        return;
    }

    // Process each parent-child relationship
    const relationshipsToAdd = [];
    
    if (fatherId) {
        // Check for cycles with father
        if (wouldCreateCycle(fatherId, childId)) {
            const fatherName = peopleMap[fatherId].name;
            const childName = peopleMap[childId].name;
            const confirmMsg = `Warning: ${childName} is already an ancestor of ${fatherName}. Creating this relationship would create a cycle. Do you want to proceed?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Check if father-child relationship already exists
        const existingFatherChildIndex = relationships.findIndex(rel =>
            rel.type === 'parentChild' &&
            rel.parentId === fatherId &&
            rel.childId === childId
        );

        if (existingFatherChildIndex >= 0) {
            const fatherName = peopleMap[fatherId].name;
            const childName = peopleMap[childId].name;
            const existingRel = relationships[existingFatherChildIndex];
            const confirmMsg = `A relationship between ${fatherName} and ${childName} already exists.\n\n` +
                `Current: Biological=${existingRel.biological}, Notes=${existingRel.notes || 'None'}\n` +
                `New: Biological=${document.getElementById('biological-relation').checked}, Notes=${document.getElementById('parent-child-notes').value.trim() || 'None'}\n\n` +
                `Do you want to update this relationship?`;

            if (!confirm(confirmMsg)) {
                return;
            }
        }

        relationshipsToAdd.push({
            parentId: fatherId,
            childId: childId
        });
    }

    if (motherId) {
        // Check for cycles with mother
        if (wouldCreateCycle(motherId, childId)) {
            const motherName = peopleMap[motherId].name;
            const childName = peopleMap[childId].name;
            const confirmMsg = `Warning: ${childName} is already an ancestor of ${motherName}. Creating this relationship would create a cycle. Do you want to proceed?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Check if mother-child relationship already exists
        const existingMotherChildIndex = relationships.findIndex(rel =>
            rel.type === 'parentChild' &&
            rel.parentId === motherId &&
            rel.childId === childId
        );

        if (existingMotherChildIndex >= 0) {
            const motherName = peopleMap[motherId].name;
            const childName = peopleMap[childId].name;
            const existingRel = relationships[existingMotherChildIndex];
            const confirmMsg = `A relationship between ${motherName} and ${childName} already exists.\n\n` +
                `Current: Biological=${existingRel.biological}, Notes=${existingRel.notes || 'None'}\n` +
                `New: Biological=${document.getElementById('biological-relation').checked}, Notes=${document.getElementById('parent-child-notes').value.trim() || 'None'}\n\n` +
                `Do you want to update this relationship?`;

            if (!confirm(confirmMsg)) {
                return;
            }
        }

        relationshipsToAdd.push({
            parentId: motherId,
            childId: childId
        });
    }

    // Add all relationships
    const biological = document.getElementById('biological-relation').checked;
    const notes = document.getElementById('parent-child-notes').value.trim() || null;

    let addedCount = 0;
    relationshipsToAdd.forEach(parentChild => {
        const existingIndex = relationships.findIndex(rel =>
            rel.type === 'parentChild' &&
            rel.parentId === parentChild.parentId &&
            rel.childId === parentChild.childId
        );

        if (existingIndex >= 0) {
            // Update existing relationship
            const relationship = relationships[existingIndex];
            relationship.biological = biological;
            relationship.notes = notes;

            // Update in treeData
            const treeDataIndex = treeData.relationships.findIndex(rel =>
                rel.type === 'parentChild' &&
                rel.parentId === parentChild.parentId &&
                rel.childId === parentChild.childId
            );
            if (treeDataIndex >= 0) {
                treeData.relationships[treeDataIndex] = relationship;
            }
        } else {
            // Create new relationship
            const relationship = {
                type: 'parentChild',
                parentId: parentChild.parentId,
                childId: parentChild.childId,
                biological: biological,
                notes: notes
            };

            relationships.push(relationship);
            treeData.relationships.push(relationship);
            addedCount++;
        }
    });

    treeData.meta.modified = new Date().toISOString();

    // Reset form
    document.getElementById('add-parent-child-form').reset();
    document.getElementById('biological-relation').checked = true;
    document.getElementById('father-search').value = '';
    document.getElementById('mother-search').value = '';
    document.getElementById('child-search').value = '';
    document.getElementById('father-select').value = '';
    document.getElementById('mother-select').value = '';
    document.getElementById('child-select').value = '';

    // Re-render tree (preserving collapsed state)
    renderTree();

    // Show success message
    const fatherName = fatherId ? peopleMap[fatherId].name : 'Unknown';
    const motherName = motherId ? peopleMap[motherId].name : 'Unknown';
    const childName = peopleMap[childId].name;
    
    let message = `Successfully added relationship(s): `;
    if (fatherId) message += `${fatherName} → ${childName} `;
    if (motherId) message += `${motherName} → ${childName}`;
    
    showMessage('add-parent-child-form', message, 'success');
}

// Handle add spouse relationship
function handleAddSpouse(e) {
    e.preventDefault();

    const spouse1Id = document.getElementById('spouse1-select').value;
    const spouse2Id = document.getElementById('spouse2-select').value;

    if (!spouse1Id || !spouse2Id) {
        showMessage('add-spouse-form', 'Please select both spouses.', 'error');
        return;
    }

    if (spouse1Id === spouse2Id) {
        showMessage('add-spouse-form', 'A person cannot be their own spouse.', 'error');
        return;
    }

    // Check if relationship already exists
    const existingIndex = relationships.findIndex(rel =>
        rel.type === 'spouse' &&
        ((rel.people[0] === spouse1Id && rel.people[1] === spouse2Id) ||
            (rel.people[0] === spouse2Id && rel.people[1] === spouse1Id))
    );

    const startYear = document.getElementById('marriage-year').value.trim();
    const endYear = document.getElementById('divorce-year').value.trim();
    const notes = document.getElementById('spouse-notes').value.trim() || null;

    let relationship;

    if (existingIndex >= 0) {
        // Relationship exists - ask for confirmation to update
        const spouse1Name = peopleMap[spouse1Id].name;
        const spouse2Name = peopleMap[spouse2Id].name;
        const existingRel = relationships[existingIndex];
        const confirmMsg = `A spouse relationship between ${spouse1Name} and ${spouse2Name} already exists.\n\n` +
            `Current: Start=${existingRel.startYear || 'None'}, End=${existingRel.endYear || 'None'}, Notes=${existingRel.notes || 'None'}\n` +
            `New: Start=${startYear || 'None'}, End=${endYear || 'None'}, Notes=${notes || 'None'}\n\n` +
            `Do you want to update this relationship?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        // Update existing relationship
        relationship = relationships[existingIndex];
        relationship.startYear = startYear ? parseInt(startYear) : null;
        relationship.endYear = endYear ? parseInt(endYear) : null;
        relationship.notes = notes;

        // Update in treeData
        const treeDataIndex = treeData.relationships.findIndex(rel =>
            rel.type === 'spouse' &&
            ((rel.people[0] === spouse1Id && rel.people[1] === spouse2Id) ||
                (rel.people[0] === spouse2Id && rel.people[1] === spouse1Id))
        );
        if (treeDataIndex >= 0) {
            treeData.relationships[treeDataIndex] = relationship;
        }
    } else {
        // Create new relationship
        relationship = {
            type: 'spouse',
            people: [spouse1Id, spouse2Id],
            startYear: startYear ? parseInt(startYear) : null,
            endYear: endYear ? parseInt(endYear) : null,
            notes: notes
        };

        relationships.push(relationship);
        treeData.relationships.push(relationship);
    }

    treeData.meta.modified = new Date().toISOString();

    // Reset form
    document.getElementById('add-spouse-form').reset();
    document.getElementById('spouse1-search').value = '';
    document.getElementById('spouse2-search').value = '';
    document.getElementById('spouse1-select').value = '';
    document.getElementById('spouse2-select').value = '';

    // Re-render tree (preserving collapsed state)
    renderTree();

    const spouse1Name = peopleMap[spouse1Id].name;
    const spouse2Name = peopleMap[spouse2Id].name;
    const action = existingIndex >= 0 ? 'updated' : 'added';
    showMessage('add-spouse-form', `Successfully ${action} relationship: ${spouse1Name} & ${spouse2Name}`, 'success');
}

// Show success/error message
function showMessage(formId, message, type) {
    const form = document.getElementById(formId);
    if (!form) return;

    const existingMsg = form.querySelector('.success-message, .error-message');
    if (existingMsg) {
        existingMsg.remove();
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'success' ? 'success-message' : 'error-message';
    msgDiv.textContent = message;
    form.appendChild(msgDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        msgDiv.remove();
    }, 5000);
}

// Show message in a specific element
function showMessageInElement(element, message, type) {
    if (!element) return;

    const existingMsg = element.querySelector('.success-message, .error-message');
    if (existingMsg) {
        existingMsg.remove();
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = type === 'success' ? 'success-message' : 'error-message';
    msgDiv.textContent = message;
    element.appendChild(msgDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        msgDiv.remove();
    }, 5000);
}


// Save to Server (POST request)
async function saveToServer() {
    if (!treeData) {
        alert('No data to save!');
        return;
    }

    const saveSection = document.querySelector('.edit-section:last-child');
    const msgContainer = saveSection || document.body;

    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(treeData, null, 2) // Pretty print
        });

        if (response.ok) {
            showMessageInElement(msgContainer, '✅ Saved to family1.json successfully!', 'success');
            // Optionally reload the tree to ensure consistency, preserving collapsed state
            // renderTree(); // Already handled by not resetting collapsedNodes
        } else {
            const err = await response.json();
            throw new Error(err.message || 'Unknown server error');
        }
    } catch (error) {
        console.error("Save failed:", error);
        showMessageInElement(msgContainer, `❌ Save Failed: ${error.message}. Make sure server.py is running!`, 'error');
    }
}

// Download JSON (Client-side)
function downloadJSON() {
    if (!treeData) {
        alert('No data to download!');
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(treeData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "family1.json");
    document.body.appendChild(downloadAnchorNode); // Required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Reload original data
function reloadOriginalData() {
    if (!originalTreeData) {
        alert('No original data to reload!');
        return;
    }

    if (confirm('Are you sure you want to reload the original data? All unsaved changes will be lost.')) {
        treeData = JSON.parse(JSON.stringify(originalTreeData));

        // Rebuild people map
        peopleMap = {};
        treeData.people.forEach(person => {
            peopleMap[person.id] = person;
        });

        relationships = treeData.relationships;
        rootPersonId = treeData.meta.rootPersonId || treeData.people[0].id;

        // Update forms
        updateEditForms();

        // Re-render tree (this will preserve collapsed state since we don't reset collapsedNodes)
        renderTree();

        const saveSection = document.querySelector('.edit-section:last-child');
        showMessageInElement(saveSection, 'Original data reloaded successfully!', 'success');
    }
}

// Safe delete person function
function handleDeletePerson(personId) {
    const person = peopleMap[personId];
    if (!person) {
        alert('Person not found!');
        return false;
    }

    // Find all relationships involving this person
    const relatedRelationships = treeData.relationships.filter(rel => {
        if (rel.type === 'parentChild') {
            return rel.parentId === personId || rel.childId === personId;
        } else if (rel.type === 'spouse') {
            return rel.people.includes(personId);
        }
        return false;
    });

    // Show warning about relationships that will be deleted
    if (relatedRelationships.length > 0) {
        const relationshipNames = relatedRelationships.map(rel => {
            if (rel.type === 'parentChild') {
                const parentName = peopleMap[rel.parentId].name;
                const childName = peopleMap[rel.childId].name;
                return `${parentName} → ${childName} (${rel.biological ? 'Biological' : 'Non-Biological'})`;
            } else if (rel.type === 'spouse') {
                const spouse1Name = peopleMap[rel.people[0]].name;
                const spouse2Name = peopleMap[rel.people[1]].name;
                return `${spouse1Name} ↔ ${spouse2Name}`;
            }
        }).join('\n');

        const confirmMsg = `Warning: Deleting ${person.name} will also delete the following relationships:\n\n${relationshipNames}\n\nDo you want to proceed?`;
        if (!confirm(confirmMsg)) {
            return false;
        }
    }

    // Check if this person is the root person
    if (treeData.meta.rootPersonId === personId) {
        const confirmRoot = `Warning: ${person.name} is the root person of the tree. Deleting them will require selecting a new root person.\n\nDo you want to proceed?`;
        if (!confirm(confirmRoot)) {
            return false;
        }
    }

    // Ask for confirmation
    const finalConfirm = `Are you sure you want to permanently delete ${person.name}? This action cannot be undone.`;
    if (!confirm(finalConfirm)) {
        return false;
    }

    // Remove all relationships involving this person
    for (let i = treeData.relationships.length - 1; i >= 0; i--) {
        const rel = treeData.relationships[i];
        if (rel.type === 'parentChild') {
            if (rel.parentId === personId || rel.childId === personId) {
                treeData.relationships.splice(i, 1);
            }
        } else if (rel.type === 'spouse') {
            if (rel.people.includes(personId)) {
                treeData.relationships.splice(i, 1);
            }
        }
    }

    // Remove the person from the people array
    treeData.people = treeData.people.filter(p => p.id !== personId);
    
    // Remove from peopleMap
    delete peopleMap[personId];

    // If this was the root person, select a new root (first remaining person)
    if (treeData.meta.rootPersonId === personId) {
        if (treeData.people.length > 0) {
            treeData.meta.rootPersonId = treeData.people[0].id;
        } else {
            treeData.meta.rootPersonId = null;
        }
    }

    // Update modification time
    treeData.meta.modified = new Date().toISOString();

    // Re-render tree
    renderTree();

    // Show success message
    showMessageInElement(document.body, `Successfully deleted ${person.name} and all related relationships.`, 'success');
    
    // Update autocomplete fields
    if (typeof initAllAutocompletes === 'function') {
        initAllAutocompletes();
    }
    
    return true;
}

// Initialize edit mode when tree data is loaded
function waitForTreeData() {
    if (typeof treeData !== 'undefined' && treeData !== null) {
        initEditMode();
    } else {
        // Wait a bit and try again
        setTimeout(waitForTreeData, 100);
    }
}

// Start waiting for tree data
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForTreeData);
} else {
    waitForTreeData();
}

