# Hakim-Sapru Family Tree

An interactive, web-based family tree visualization tool.

## Features
- **Interactive Visualization**: Zoom, pan, and explore generations.
- **Rich Details**: Hover for "cloud" tooltips with age, aliases, and connection highlighting.
- **Editing**: Add new family members and relationships directly in the browser.
- **Theming**: Toggle between Light/Dark modes with a nature-inspired design.
- **Export**: Generate high-quality PNG images of your tree.

## Usage

### Local Development (Recommended)
To enable saving changes to the JSON file:
1. Run the local server:
   ```bash
   python3 server.py
   ```
2. Open [http://localhost:8000](http://localhost:8000).

### Static Hosting (e.g., GitHub Pages)
- **Viewing**: Works perfectly.
- **Editing**: Changes are saved in memory but **cannot** normally persist to the file.
- **Saving**: Use the "Download Updated JSON" button in the Edit panel to save your changes manually, then commit the file to your repository.

## Technologies
- D3.js (Visualization)
- Vanilla JS (Logic)
- CSS3 (Styling & Animations)
- Python (Local Server)
  - Gold highlight for the root person (Kartik)
- **Zoom & Pan**: Use mouse wheel to zoom, drag to pan
- **Relationship Lines**:
  - Green lines for parent-child relationships
## Next Steps

The edit mode button is currently disabled. This will be implemented in the next phase to allow adding new people and relationships.

