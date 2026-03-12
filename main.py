import sys
from src.parsing.def_parser import DEFParser

def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <def_file>")
        sys.exit(1)

    parser = DEFParser()
    board = parser.parse(sys.argv[1])

    print(f"Design: {board.name}")
    print(f"Die area: {board.die_area}")
    print(f"Components: {len(board.components)}")
    print(f"Nets: {len(board.nets)}")

if __name__ == "__main__":
    main()