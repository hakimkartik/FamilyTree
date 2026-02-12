#!/usr/bin/env python3
"""
Interactive Family Tree Builder
Build a family tree in JSON format with people and relationships
"""

import json
import os
from datetime import datetime

class FamilyTreeBuilder:
    def __init__(self):
        self.tree = {
            "meta": {
                "title": "Family Tree",
                "rootPersonId": None,
                "notes": "",
                "created": datetime.now().isoformat(),
                "modified": datetime.now().isoformat()
            },
            "people": [],
            "relationships": []
        }
        self.people_dict = {}  # For quick lookup
        
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def print_header(self):
        """Print application header"""
        print("=" * 60)
        print("          FAMILY TREE BUILDER - Interactive Edition")
        print("=" * 60)
        print()
    
    def generate_id(self, name):
        """Generate a unique ID from a name"""
        base = name.lower().replace(" ", "_")
        base = ''.join(c for c in base if c.isalnum() or c == '_')
        
        # Check if ID exists, append number if needed
        if base in self.people_dict:
            counter = 1
            while f"{base}_{counter}" in self.people_dict:
                counter += 1
            return f"{base}_{counter}"
        return base
    
    def add_person(self):
        """Add a new person to the family tree"""
        self.clear_screen()
        self.print_header()
        print("ADD NEW PERSON")
        print("-" * 40)
        
        name = input("Full name: ").strip()
        if not name:
            print("Name is required!")
            input("\nPress Enter to continue...")
            return
        
        person_id = self.generate_id(name)
        
        print(f"\nGenerated ID: {person_id}")
        customize_id = input("Customize ID? (y/N): ").lower().strip()
        if customize_id == 'y':
            person_id = input("Enter custom ID: ").strip()
            if not person_id:
                person_id = self.generate_id(name)
        
        gender = input("Gender (M/F/Other): ").upper().strip() or None
        
        # Aliases
        aliases = []
        print("\nEnter aliases (nicknames, alternate names)")
        print("Press Enter without input to finish)")
        while True:
            alias = input("  Alias: ").strip()
            if not alias:
                break
            aliases.append(alias)
        
        # Birth/Death years
        birth_year = input("\nBirth year (or press Enter to skip): ").strip()
        birth_year = int(birth_year) if birth_year else None
        
        death_year = input("Death year (or press Enter if alive): ").strip()
        death_year = int(death_year) if death_year else None
        
        notes = input("\nNotes (optional): ").strip() or None
        
        # Create person object
        person = {
            "id": person_id,
            "name": name,
            "gender": gender,
            "aliases": aliases,
            "birthYear": birth_year,
            "deathYear": death_year,
            "notes": notes
        }
        
        self.tree["people"].append(person)
        self.people_dict[person_id] = person
        print(f"\n✅ Added: {name} (ID: {person_id})")
        
        # If this is the first person, ask if they should be root
        if len(self.tree["people"]) == 1:
            set_root = input("\nSet this person as root of the tree? (Y/n): ").lower().strip()
            if set_root != 'n':
                self.tree["meta"]["rootPersonId"] = person_id
                print("✅ Set as root person")
        
        # Update modification timestamp
        self.tree["meta"]["modified"] = datetime.now().isoformat()
        input("\nPress Enter to continue...")
    
    def add_spouse_relationship(self):
        """Add a spouse relationship"""
        self.clear_screen()
        self.print_header()
        print("ADD SPOUSE RELATIONSHIP")
        print("-" * 40)
        
        if len(self.tree["people"]) < 2:
            print("❌ Need at least 2 people to create a relationship!")
            input("\nPress Enter to continue...")
            return
        
        self.list_people()
        
        person1 = input("\nEnter ID of first spouse: ").strip()
        person2 = input("Enter ID of second spouse: ").strip()
        
        if person1 not in self.people_dict or person2 not in self.people_dict:
            print("❌ One or both people not found!")
            input("\nPress Enter to continue...")
            return
        
        start_year = input("Marriage year (or press Enter to skip): ").strip()
        start_year = int(start_year) if start_year else None
        
        end_year = input("Divorce/death year (or press Enter if ongoing): ").strip()
        end_year = int(end_year) if end_year else None
        
        notes = input("Notes (optional): ").strip() or None
        
        relationship = {
            "type": "spouse",
            "people": [person1, person2],
            "startYear": start_year,
            "endYear": end_year,
            "notes": notes
        }
        
        self.tree["relationships"].append(relationship)
        self.tree["meta"]["modified"] = datetime.now().isoformat()
        print(f"\n✅ Added spouse relationship between {self.people_dict[person1]['name']} and {self.people_dict[person2]['name']}")
        input("\nPress Enter to continue...")
    
    def add_parent_child_relationship(self):
        """Add a parent-child relationship"""
        self.clear_screen()
        self.print_header()
        print("ADD PARENT-CHILD RELATIONSHIP")
        print("-" * 40)
        
        if len(self.tree["people"]) < 2:
            print("❌ Need at least 2 people to create a relationship!")
            input("\nPress Enter to continue...")
            return
        
        self.list_people()
        
        parent_id = input("\nEnter ID of parent: ").strip()
        child_id = input("Enter ID of child: ").strip()
        
        if parent_id not in self.people_dict or child_id not in self.people_dict:
            print("❌ One or both people not found!")
            input("\nPress Enter to continue...")
            return
        
        biological = input("Is this a biological relationship? (Y/n): ").lower().strip()
        biological = biological != 'n'
        
        notes = input("Notes (optional): ").strip() or None
        
        relationship = {
            "type": "parentChild",
            "parentId": parent_id,
            "childId": child_id,
            "biological": biological,
            "notes": notes
        }
        
        self.tree["relationships"].append(relationship)
        self.tree["meta"]["modified"] = datetime.now().isoformat()
        print(f"\n✅ Added parent-child relationship: {self.people_dict[parent_id]['name']} -> {self.people_dict[child_id]['name']}")
        input("\nPress Enter to continue...")
    
    def list_people(self):
        """Display all people in the tree"""
        print("\nPeople in tree:")
        print("-" * 40)
        for person in self.tree["people"]:
            aliases_str = f" ({', '.join(person['aliases'])})" if person['aliases'] else ""
            birth_str = f" b.{person['birthYear']}" if person['birthYear'] else ""
            death_str = f" d.{person['deathYear']}" if person['deathYear'] else ""
            root_marker = " 👑" if person['id'] == self.tree["meta"]["rootPersonId"] else ""
            print(f"  {person['id']}: {person['name']}{aliases_str}{birth_str}{death_str}{root_marker}")
    
    def view_tree(self):
        """Display the current tree structure"""
        self.clear_screen()
        self.print_header()
        print("CURRENT FAMILY TREE")
        print("=" * 40)
        
        print(f"\nTitle: {self.tree['meta']['title']}")
        if self.tree['meta']['rootPersonId']:
            root = self.people_dict.get(self.tree['meta']['rootPersonId'], {})
            print(f"Root: {root.get('name', 'Unknown')} ({self.tree['meta']['rootPersonId']})")
        
        # Handle missing timestamps gracefully
        created = self.tree['meta'].get('created', 'Not set')
        modified = self.tree['meta'].get('modified', 'Not set')
        print(f"Created: {created}")
        print(f"Modified: {modified}")
        
        print(f"\n👥 People: {len(self.tree['people'])}")
        self.list_people()
        
        print(f"\n💍 Relationships: {len(self.tree['relationships'])}")
        for rel in self.tree["relationships"]:
            if rel["type"] == "spouse":
                p1 = self.people_dict.get(rel["people"][0], {}).get("name", rel["people"][0])
                p2 = self.people_dict.get(rel["people"][1], {}).get("name", rel["people"][1])
                years = f" ({rel['startYear']}" if rel['startYear'] else " ("
                years += f"-{rel['endYear']}" if rel['endYear'] else "-present"
                years += ")" if rel['startYear'] or rel['endYear'] else ""
                print(f"  💑 {p1} & {p2}{years}")
            elif rel["type"] == "parentChild":
                parent = self.people_dict.get(rel["parentId"], {}).get("name", rel["parentId"])
                child = self.people_dict.get(rel["childId"], {}).get("name", rel["childId"])
                bio = " (biological)" if rel["biological"] else ""
                print(f"  👪 {parent} -> {child}{bio}")
        
        input("\nPress Enter to continue...")
    
    def export_to_json(self):
        """Export the tree to a JSON file"""
        self.clear_screen()
        self.print_header()
        print("EXPORT TO JSON")
        print("-" * 40)
        
        if not self.tree["people"]:
            print("❌ No data to export!")
            input("\nPress Enter to continue...")
            return
        
        # Update modification timestamp
        self.tree["meta"]["modified"] = datetime.now().isoformat()
        
        filename = input("Enter filename (default: family_tree.json): ").strip()
        if not filename:
            filename = "family_tree.json"
        if not filename.endswith('.json'):
            filename += '.json'
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.tree, f, indent=2, ensure_ascii=False)
            print(f"\n✅ Successfully exported to {filename}")
        except Exception as e:
            print(f"\n❌ Error exporting: {e}")
        
        input("\nPress Enter to continue...")
    
    def import_from_json(self):
        """Import a tree from a JSON file"""
        self.clear_screen()
        self.print_header()
        print("IMPORT FROM JSON")
        print("-" * 40)
        
        filename = input("Enter filename to import: ").strip()
        if not filename:
            print("❌ No filename provided!")
            input("\nPress Enter to continue...")
            return
        
        if not filename.endswith('.json'):
            filename += '.json'
        
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                imported_tree = json.load(f)
            
            # Validate basic structure
            if "people" not in imported_tree or "relationships" not in imported_tree:
                print("❌ Invalid family tree file!")
                input("\nPress Enter to continue...")
                return
            
            self.tree = imported_tree
            
            # Ensure meta has created and modified fields
            if "created" not in self.tree["meta"]:
                self.tree["meta"]["created"] = datetime.now().isoformat()
            if "modified" not in self.tree["meta"]:
                self.tree["meta"]["modified"] = datetime.now().isoformat()
            
            # Rebuild people_dict
            self.people_dict = {}
            for person in self.tree["people"]:
                self.people_dict[person["id"]] = person
            
            print(f"\n✅ Successfully imported {len(self.tree['people'])} people and {len(self.tree['relationships'])} relationships")
        except FileNotFoundError:
            print(f"\n❌ File not found: {filename}")
        except json.JSONDecodeError:
            print("\n❌ Invalid JSON file!")
        except Exception as e:
            print(f"\n❌ Error importing: {e}")
        
        input("\nPress Enter to continue...")
    
    def edit_meta(self):
        """Edit metadata"""
        self.clear_screen()
        self.print_header()
        print("EDIT METADATA")
        print("-" * 40)
        
        print(f"Current title: {self.tree['meta']['title']}")
        new_title = input("New title (or press Enter to keep): ").strip()
        if new_title:
            self.tree['meta']['title'] = new_title
        
        print(f"\nCurrent root person: {self.tree['meta']['rootPersonId']}")
        if self.tree['people']:
            self.list_people()
            new_root = input("New root person ID (or press Enter to keep): ").strip()
            if new_root:
                if new_root in self.people_dict:
                    self.tree['meta']['rootPersonId'] = new_root
                else:
                    print("❌ Person not found!")
        
        print(f"\nCurrent notes: {self.tree['meta']['notes']}")
        new_notes = input("New notes (or press Enter to keep): ").strip()
        if new_notes:
            self.tree['meta']['notes'] = new_notes
        
        self.tree['meta']['modified'] = datetime.now().isoformat()
        print("\n✅ Metadata updated")
        input("\nPress Enter to continue...")
    
    def run(self):
        """Main interactive loop"""
        while True:
            self.clear_screen()
            self.print_header()
            
            print(f"👥 People: {len(self.tree['people'])}  |  💍 Relationships: {len(self.tree['relationships'])}")
            if self.tree['meta']['rootPersonId']:
                root = self.people_dict.get(self.tree['meta']['rootPersonId'], {})
                print(f"👑 Root: {root.get('name', 'Unknown')}")
            print()
            print("MAIN MENU")
            print("-" * 40)
            print("1. ➕ Add Person")
            print("2. 💑 Add Spouse Relationship")
            print("3. 👪 Add Parent-Child Relationship")
            print("4. 👥 List All People")
            print("5. 🌳 View Family Tree")
            print("6. 📤 Export to JSON")
            print("7. 📥 Import from JSON")
            print("8. ⚙️  Edit Metadata")
            print("9. 🧹 New Tree (Clear All)")
            print("0. 🚪 Exit")
            print()
            
            choice = input("Enter your choice (0-9): ").strip()
            
            if choice == '1':
                self.add_person()
            elif choice == '2':
                self.add_spouse_relationship()
            elif choice == '3':
                self.add_parent_child_relationship()
            elif choice == '4':
                self.clear_screen()
                self.print_header()
                self.list_people()
                input("\nPress Enter to continue...")
            elif choice == '5':
                self.view_tree()
            elif choice == '6':
                self.export_to_json()
            elif choice == '7':
                self.import_from_json()
            elif choice == '8':
                self.edit_meta()
            elif choice == '9':
                confirm = input("Are you sure? This will delete all data! (y/N): ").lower().strip()
                if confirm == 'y':
                    self.__init__()
                    print("✅ Created new empty tree")
                    input("\nPress Enter to continue...")
            elif choice == '0':
                print("\n👋 Goodbye!")
                break
            else:
                print("\n❌ Invalid choice!")
                input("Press Enter to continue...")


def main():
    builder = FamilyTreeBuilder()
    
    # Optional: Load example data from your JSON
    example_mode = input("Load example family tree? (y/N): ").lower().strip()
    if example_mode == 'y':
        now = datetime.now().isoformat()
        example_data = {
            "meta": {
                "title": "Family Tree",
                "rootPersonId": "kartik",
                "notes": "",
                "created": now,
                "modified": now
            },
            "people": [
                {"id": "kartik", "name": "Kartik Hakim", "gender": "M", "aliases": ["Navreh"], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "ramesh", "name": "Ramesh Hakim", "gender": "M", "aliases": ["kuku ji"], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "aneeta", "name": "Aneeta Sapru", "gender": "F", "aliases": ["Anita Hakim", "Bunty"], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "giridhari", "name": "Giridhari Lal Hakim", "gender": "M", "aliases": [], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "rani", "name": "Rani Hakim", "gender": "F", "aliases": ["JaiKishori Razdan"], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "bhushan", "name": "Bhushan Lal Sapru", "gender": "M", "aliases": [], "birthYear": None, "deathYear": None, "notes": None},
                {"id": "veena", "name": "Veena Sapru", "gender": "F", "aliases": ["RajKumari Raina"], "birthYear": None, "deathYear": None, "notes": None}
            ],
            "relationships": [
                {"type": "spouse", "people": ["ramesh", "aneeta"], "startYear": None, "endYear": None, "notes": None},
                {"type": "spouse", "people": ["ramesh", "veena"], "startYear": None, "endYear": None, "notes": None},
                {"type": "spouse", "people": ["giridhari", "rani"], "startYear": None, "endYear": None, "notes": None},
                {"type": "parentChild", "parentId": "ramesh", "childId": "kartik", "biological": True, "notes": None},
                {"type": "parentChild", "parentId": "aneeta", "childId": "kartik", "biological": True, "notes": None},
                {"type": "parentChild", "parentId": "giridhari", "childId": "ramesh", "biological": True, "notes": None},
                {"type": "parentChild", "parentId": "rani", "childId": "ramesh", "biological": True, "notes": None},
                {"type": "parentChild", "parentId": "bhushan", "childId": "aneeta", "biological": True, "notes": None},
                {"type": "parentChild", "parentId": "veena", "childId": "aneeta", "biological": True, "notes": None}
            ]
        }
        builder.tree = example_data
        for person in example_data["people"]:
            builder.people_dict[person["id"]] = person
        print("✅ Loaded example family tree")
        input("\nPress Enter to continue...")
    
    builder.run()


if __name__ == "__main__":
    main()