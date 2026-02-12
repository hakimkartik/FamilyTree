import http.server
import socketserver
import json
import os

PORT = 8000
DATA_FILE = 'family1.json'

class FamilyTreeHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data)
                
                # Basic validation
                if 'people' not in data or 'relationships' not in data:
                    raise ValueError("Invalid family tree data format")

                # Backup existing file just in case
                if os.path.exists(DATA_FILE):
                    os.replace(DATA_FILE, DATA_FILE + '.bak')

                # Write new data
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success', 'message': 'Data saved successfully'}).encode())
                print(f"✅ Data saved to {DATA_FILE}")
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode())
                print(f"❌ Error saving data: {e}")
        else:
            self.send_error(404, "File not found")

    def end_headers(self):
        # Add CORS headers for local development if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

print(f"🌳 Family Tree Server running at http://localhost:{PORT}")
print(f"📂 serving files from {os.getcwd()}")
print(f"💾 /save endpoint ready to write to {DATA_FILE}")

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReusableTCPServer(("", PORT), FamilyTreeHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
