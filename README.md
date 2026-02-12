# Family Tree Visualization

An interactive web application to visualize your family tree with Kartik at the center.

## Setup

1. Make sure all files are in the same directory:
   - `index.html`
   - `styles.css`
   - `tree-visualization.js`
   - `family1.json`

2. Start a local web server (required because of CORS restrictions when loading JSON):

   **Option 1: Python 3**
   ```bash
   python3 -m http.server 8000
   ```

   **Option 2: Python 2**
   ```bash
   python -m SimpleHTTPServer 8000
   ```

   **Option 3: Node.js (if you have http-server installed)**
   ```bash
   npx http-server -p 8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Features

- **Centered View**: Kartik is displayed at the center of the tree
- **Interactive**: Click on any person to see their details
- **Color-coded**: 
  - Blue circles for males
  - Pink circles for females
  - Gold highlight for the root person (Kartik)
- **Zoom & Pan**: Use mouse wheel to zoom, drag to pan
- **Relationship Lines**:
  - Green lines for parent-child relationships
  - Red dashed lines for spouse relationships

## Next Steps

The edit mode button is currently disabled. This will be implemented in the next phase to allow adding new people and relationships.

