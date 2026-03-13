from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass, field


@dataclass
class Pin:
    name: str
    x: int
    y: int
    net_id: Optional[str] = None


@dataclass
class Component:
    name: str
    type: str
    x: int
    y: int
    width: int = 400
    height: int = 400
    pins: Dict[str, Pin] = field(default_factory=dict)


@dataclass
class Net:
    name: str
    pins: List[Pin] = field(default_factory=list)
    route: List[Tuple[int, int]] = field(default_factory=list)
    is_routed: bool = False
    length: int = 0
    
    def add_pin(self, pin: Pin):
        self.pins.append(pin)
        pin.net_id = self.name
    
    def get_pin_positions(self) -> List[Tuple[int, int]]:
        return [(pin.x, pin.y) for pin in self.pins]


class Board:    
    def __init__(self, name: str, die_area: Tuple[int, int, int, int]):
        self.name = name
        self.die_area = die_area
        self.components: Dict[str, Component] = {}
        self.nets: Dict[str, Net] = {}
        self.grid = None  # Will be set later
        
        llx, lly, urx, ury = die_area
        self.width = urx - llx
        self.height = ury - lly
        self.llx, self.lly = llx, lly
        
    def add_component(self, component: Component):
        self.components[component.name] = component
    
    def add_net(self, net: Net):
        self.nets[net.name] = net
    
    def get_net_pins(self, net_name: str) -> List[Tuple[int, int]]:
        if net_name in self.nets:
            return self.nets[net_name].get_pin_positions()
        return []
    
    def get_component_by_pin(self, pin_name: str) -> Optional[Component]:
        for comp in self.components.values():
            if pin_name in comp.pins:
                return comp
        return None
    
    def to_grid_coords(self, x: int, y: int, cell_size: int = 400) -> Tuple[int, int]:
        grid_x = (x - self.llx) // cell_size
        grid_y = (y - self.lly) // cell_size
        return (grid_x, grid_y)
    
    def to_physical_coords(self, grid_x: int, grid_y: int, cell_size: int = 400) -> Tuple[int, int]:
        x = self.llx + grid_x * cell_size
        y = self.lly + grid_y * cell_size
        return (x, y)