// Autocomplete functionality for relationship forms

// Initialize autocomplete for an input field
function initAutocomplete(inputId, hiddenId, suggestionsId, onSelect) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const suggestions = document.getElementById(suggestionsId);
    let selectedIndex = -1;
    let currentSuggestions = [];
    
    // Get all people for autocomplete
    function getPeopleList() {
        return Object.values(peopleMap).map(person => ({
            id: person.id,
            name: person.name,
            aliases: person.aliases || [],
            displayText: person.name + (person.aliases.length > 0 ? ` (${person.aliases.join(', ')})` : '')
        }));
    }
    
    // Filter people based on search term
    function filterPeople(searchTerm) {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        return getPeopleList().filter(person => 
            person.name.toLowerCase().includes(term) ||
            person.id.toLowerCase().includes(term) ||
            person.aliases.some(alias => alias.toLowerCase().includes(term))
        );
    }
    
    // Show suggestions
    function showSuggestions(filtered) {
        currentSuggestions = filtered;
        selectedIndex = -1;
        
        if (filtered.length === 0) {
            suggestions.classList.remove('show');
            return;
        }
        
        suggestions.innerHTML = filtered.map((person, index) => `
            <div class="autocomplete-suggestion" data-index="${index}" data-id="${person.id}">
                <div class="autocomplete-suggestion-name">${person.displayText}</div>
                <div class="autocomplete-suggestion-id">ID: ${person.id}</div>
            </div>
        `).join('');
        
        suggestions.classList.add('show');
        
        // Add click handlers
        suggestions.querySelectorAll('.autocomplete-suggestion').forEach(item => {
            item.addEventListener('click', () => {
                const person = currentSuggestions[parseInt(item.dataset.index)];
                selectPerson(person);
            });
        });
    }
    
    // Select a person
    function selectPerson(person) {
        input.value = person.displayText;
        hidden.value = person.id;
        suggestions.classList.remove('show');
        if (onSelect) onSelect(person);
    }
    
    // Handle input
    input.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length === 0) {
            hidden.value = '';
            suggestions.classList.remove('show');
            return;
        }
        
        const filtered = filterPeople(term);
        showSuggestions(filtered);
    });
    
    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (!suggestions.classList.contains('show')) return;
        
        const items = suggestions.querySelectorAll('.autocomplete-suggestion');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
                selectPerson(currentSuggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            suggestions.classList.remove('show');
        }
    });
    
    // Update visual selection
    function updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('show');
        }
    });
    
    // Clear function
    function clear() {
        input.value = '';
        hidden.value = '';
        suggestions.classList.remove('show');
    }
    
    return { clear, selectPerson, getValue: () => hidden.value };
}

// Initialize all autocomplete fields
function initAllAutocompletes() {
    initAutocomplete('parent-search', 'parent-select', 'parent-suggestions');
    initAutocomplete('child-search', 'child-select', 'child-suggestions');
    initAutocomplete('spouse1-search', 'spouse1-select', 'spouse1-suggestions');
    initAutocomplete('spouse2-search', 'spouse2-select', 'spouse2-suggestions');
}

