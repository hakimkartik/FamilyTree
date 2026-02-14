# Family Tree Visualization

An interactive, web-based family tree visualization tool with advanced features for exploring genealogical relationships.

## Features

### 🎨 Visual Enhancements
- **Smooth Animations**: Nodes gracefully enter the tree with physics-based spring animations
- **Animated Links**: Connections grow organically with stroke-dashoffset animations
- **Gender-based Coloring**: Males displayed with blue gradients, females with pink gradients, others with green/yellow gradients
- **Circular Avatars**: Personalized avatars with initials for each family member

### 🖱️ Interactive Elements
- **Zoom & Pan**: Full navigation controls with mouse wheel zoom and drag-to-pan functionality
- **Detailed Information**: Click on any person to view their complete profile information
- **Highlighting**: Hover over nodes to highlight connected family members
- **Search Functionality**: Quickly find family members by name
- **Trackpad/Mouse Hints**: On-screen guidance for zooming and panning

### 🌳 Tree Structure
- **Collapsible Branches**: Toggle visibility of family branches with +/- buttons
- **Dual View Modes**: Switch between extended family view and direct descendants view
- **Customizable Focus**: Select any person to view only their direct descendants
- **Curved Elbow Connectors**: Clean, readable connections between family members

### 🛠️ Editing Capabilities
- **Add/Edit Members**: Modify family tree data directly through the interface
- **Relationship Management**: Add parent-child and spouse relationships
- **Data Persistence**: Save changes back to the JSON file or download as JSON

### 🎯 Navigation Controls
- **Zoom Controls**: Precise zoom in/out/reset functionality
- **View Toggle**: Intuitive sliding toggle to switch between extended family and direct descendants views
- **Person Selector**: Choose which person's lineage to focus on (when in direct descendants mode)
- **Theme Support**: Light (pink) and dark (blue) themes with automatic switching

## Technical Implementation

Built with D3.js for powerful data visualization, featuring:
- Responsive SVG-based rendering
- Physics-based animations for natural movement
- Dynamic layout algorithms for optimal node placement
- Comprehensive relationship mapping
- Gender-aware visual styling
- Intuitive user interface with contextual hints

## Usage

1. Open `index.html` in a modern web browser
2. Explore the family tree using zoom and pan controls
3. Click nodes to view detailed information
4. Use the toggle controls to switch between different viewing modes
5. Access edit mode to modify the family tree data

## Files

- `index.html`: Main application interface
- `tree-visualization.js`: Core visualization logic
- `styles.css`: Styling and themes
- `family1.json`: Sample family data (replace with your own data)
- `server.py`: Optional server for saving changes

## Customization

To use your own family data:
1. Modify `family1.json` with your family information
2. Or replace the data file and update the reference in `tree-visualization.js`

For optimal results, ensure your JSON follows the expected schema with proper relationship definitions.