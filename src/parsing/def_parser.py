
import re
import numpy as np
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class Orientation(Enum):
    N = "N"
    S = "S"
    E = "E"
    W = "W"
    FN = "FN"
    FS = "FS"
    FE = "FE"
    FW = "FW"


@dataclass
class Pin:
    name: str
    x: int
    y: int
    layer: str = "Metal1"


@dataclass
class Component:
    name: str
    type: str
    x: int
    y: int
    orientation: Orientation
    pins: List[Pin] = field(default_factory=list)


@dataclass
class Net:
    name: str
    pins: List[Tuple[str, str]]
    route: List[Tuple[int, int]] = field(default_factory=list)
    is_routed: bool = False


@dataclass
class RoutingGrid:
    width: int
    height: int
    grid: np.ndarray
    obstacles: np.ndarray
    usage: np.ndarray
    capacity: np.ndarray
    cell_size: int = 400

    llx: int = 0
    lly: int = 0

    def get_cell(self, x: int, y: int) -> Dict:
        grid_x = x // self.cell_size
        grid_y = y // self.cell_size
        if 0 <= grid_x < self.width and 0 <= grid_y < self.height:
            return {
                'x': grid_x,
                'y': grid_y,
                'is_obstacle': self.obstacles[grid_y, grid_x],
                'usage': self.usage[grid_y, grid_x],
                'capacity': self.capacity[grid_y, grid_x]
            }
        return None


@dataclass
class Board:
    name: str
    die_area: Tuple[int, int, int, int]
    rows: List[Dict]
    tracks: Dict[str, Dict]
    components: Dict[str, Component]
    nets: Dict[str, Net]
    grid: RoutingGrid

    llx: int = 0
    lly: int = 0


class DEFParser:
    def __init__(self):
        self.components: Dict[str, Component] = {}
        self.nets: Dict[str, Net] = {}
        self.die_area = None
        self.rows = []
        self.tracks = {}
        self.name = ""

    def parse(self, filename: str) -> Board:
        with open(filename, 'r') as f:
            content = f.read()

        design_match = re.search(r'DESIGN\s+(\S+)', content)
        if design_match:
            self.name = design_match.group(1)

        self._parse_diearea(content)
        self._parse_rows(content)
        self._parse_tracks(content)
        self._parse_components(content)
        self._parse_nets(content)

        board = self._build_board()

        return board

    def _parse_diearea(self, content: str):
        match = re.search(r'DIEAREA\s*\(\s*(\d+)\s+(\d+)\s*\)\s*\(\s*(\d+)\s+(\d+)\s*\)', content, re.DOTALL)
        if match:
            self.die_area = (
                int(match.group(1)),
                int(match.group(2)),
                int(match.group(3)),
                int(match.group(4))
            )

    def _parse_rows(self, content: str):
        for match in re.finditer(
                r'ROW\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\S+)\s+DO\s+(\d+)\s+BY\s+(\d+)\s+STEP\s+(\d+)\s+(\d+)',
                content):
            self.rows.append({
                'name': match.group(1),
                'site': match.group(2),
                'x': int(match.group(3)),
                'y': int(match.group(4)),
                'orientation': match.group(5),
                'count_x': int(match.group(6)),
                'count_y': int(match.group(7)),
                'step_x': int(match.group(8)),
                'step_y': int(match.group(9))
            })

    def _parse_tracks(self, content: str):
        for match in re.finditer(r'TRACKS\s+(\S+)\s+(\d+)\s+DO\s+(\d+)\s+STEP\s+(\d+)\s+LAYER\s+(\S+)', content):
            direction = match.group(1)
            start = int(match.group(2))
            count = int(match.group(3))
            step = int(match.group(4))
            layer = match.group(5)

            if layer not in self.tracks:
                self.tracks[layer] = {}
            self.tracks[layer][direction] = {'start': start, 'count': count, 'step': step}

    def _parse_components(self, content: str):
        comp_section = re.search(r'COMPONENTS\s+(\d+)\s*;(.*?)END\s+COMPONENTS', content, re.DOTALL)
        if comp_section:
            comp_text = comp_section.group(2)
            for match in re.finditer(r'-\s+(\S+)\s+(\S+)\s+\+\s+PLACED\s+\(\s*(\d+)\s+(\d+)\s*\)\s+(\S+)', comp_text):
                self.components[match.group(1)] = Component(
                    name=match.group(1),
                    type=match.group(2),
                    x=int(match.group(3)),
                    y=int(match.group(4)),
                    orientation=Orientation(match.group(5))
                )

    def _parse_nets(self, content: str):
        nets_section = re.search(r'NETS\s+(\d+)\s*;(.*?)END\s+NETS', content, re.DOTALL)
        if nets_section:
            nets_text = nets_section.group(2)

            net_blocks = re.split(r'-\s+(\S+)', nets_text)[1:]

            for i in range(0, len(net_blocks), 2):
                net_name = net_blocks[i].strip()
                net_content = net_blocks[i + 1] if i + 1 < len(net_blocks) else ""

                # Extract pins
                pins = []
                pin_matches = re.finditer(r'\(\s*(\S+)\s+(\S+)\s*\)', net_content)
                for match in pin_matches:
                    pins.append((match.group(1), match.group(2)))

                if pins:
                    self.nets[net_name] = Net(name=net_name, pins=pins)

    def _build_board(self) -> Board:
        if not self.die_area:
            raise ValueError("DIEAREA not parsed")

        llx, lly, urx, ury = self.die_area

        grid_pitch = 400
        for layer, tracks in self.tracks.items():
            if 'X' in tracks:
                grid_pitch = tracks['X']['step']
                break

        grid_width = (urx - llx) // grid_pitch
        grid_height = (ury - lly) // grid_pitch

        obstacles = np.zeros((grid_height, grid_width), dtype=bool)
        usage = np.zeros((grid_height, grid_width), dtype=int)
        capacity = np.ones((grid_height, grid_width), dtype=int) * 3 

        for comp in self.components.values():
            grid_x = (comp.x - llx) // grid_pitch
            grid_y = (comp.y - lly) // grid_pitch

            for dx in range(2):
                for dy in range(2):
                    if 0 <= grid_x + dx < grid_width and 0 <= grid_y + dy < grid_height:
                        obstacles[grid_y + dy, grid_x + dx] = True

        routing_grid = RoutingGrid(
            width=grid_width,
            height=grid_height,
            grid=np.zeros((grid_height, grid_width)),
            obstacles=obstacles,
            usage=usage,
            capacity=capacity,
            cell_size=grid_pitch,
            llx=llx,
            lly=lly
        )

        return Board(
            name=self.name,
            die_area=self.die_area,
            rows=self.rows,
            tracks=self.tracks,
            components=self.components,
            nets=self.nets,
            grid=routing_grid,
            llx=llx,
            lly=lly
        )