import Konva from 'konva';
import StateManager, { SerializableState } from './StateManager';
import { Tool } from './Tool';
import { Vector2d } from 'konva/lib/types';
import SelectableObject from './SelectableObject';
import { v4 as uuidv4 } from 'uuid';

/**
 * The class that holds node information (label, start node status, etc)
 * and connects it to the visual representation on the screen.
 */
export default class NodeWrapper extends SelectableObject {

  /** The radius of the node circle in the UI. */
  public static readonly NodeRadius = 30;

  /** The color of the circle around selected nodes. */
  public static readonly SelectedStrokeColor = '#018ED5';

  /** The stroke width of the circle around selected nodes. */
  public static readonly SelectedStrokeWidth = 4;

  /** The color of the circle around unselected nodes. */
  public static readonly StrokeColor = 'black';

  /** The width of the circle around unselected nodes. */
  public static readonly StrokeWidth = 2;

  /** The Konva object used to draw the node circle. */
  private nodeBackground: Konva.Circle;

  /**
   * The Konva object used to draw the small inner circle on the node,
   * indicating that it is an accept state.
   */
  private nodeAcceptCircle: Konva.Circle;

  /** The Konva object used to draw the node's label. */
  private nodeLabel: Konva.Text;

  /** The group of Konva objects related to this node. */
  public nodeGroup: Konva.Group;

  private lastPos: Vector2d;

  /** The previous grid aligned position. */
  private lastSnappedPos: Vector2d = { x: 0, y: 0 };

  /**
   * Whether or not this node is an accepting node.
   * 
   * **NOTE:** This should almost never be directly modified. Instead, use
   * `NodeWrapper.isAcceptNode` (getter/setter).
   */
  private _isAcceptNode: boolean = false;

  /**
   * The label text for this node.
   * 
   * **NOTE:** This should almost never be directly modified. Instead, use
   * `NodeWrapper.labelText` (getter/setter).
   */
  private _labelText: string = "state";

  /** A unique ID which persists for this node.
   * 
   * **NOTE:** Use `NodeWrapper.id` (getter) instead to access this.
   */
  private readonly _id: string

  /**
   * A unique ID which persists for this node.
   * Useful for serialization and deserialization to maintain references.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Converts this node wrapper into an object that can be serialized.
   * @returns {SerializableState} A serializable state object.
   */
  public toSerializable(): SerializableState {
    return {
      id: this.id,
      x: this.nodeGroup.x(),
      y: this.nodeGroup.y(),
      label: this.labelText
    }
  }

  /**
   * Constructs a new node wrapper.
   * @param {string} label The text to use for as this node's label.
   * @param {string | null} [id] The unique ID which will persist when the
    * node is changed.
    * This will be autogenerated by default, which is fine when building new
    * automata. However, if you are loading an existing automaton, this ID is
    * how you will maintain relationships between this node and things that
    * reference it.
   */
  constructor(label: string, id: string | null = null) {
    super();
    this._id = id ?? uuidv4();
    this._labelText = label;
  }

  /**
   * Builds the Konva UI objects to draw this node.
   * @param {number} x The X coordinate at which to place the node.
   * @param {number} y The Y coordinate at which to place the node.
   */
  public createKonvaObjects(x: number, y: number) {
    this.nodeGroup = new Konva.Group({ x: x, y: y });

    // create our shape
    this.nodeBackground = new Konva.Circle({
      x: 0,
      y: 0,
      radius: NodeWrapper.NodeRadius,
      fill: StateManager.colorScheme.nodeFill,
      stroke: StateManager.colorScheme.nodeStrokeColor,
      strokeWidth: NodeWrapper.StrokeWidth
    });

    this.nodeAcceptCircle = new Konva.Circle({
      x: 0,
      y: 0,
      radius: NodeWrapper.NodeRadius * 0.8,
      fill: 'transparent',
      stroke: StateManager.colorScheme.nodeAcceptStrokeColor,
      strokeWidth: 1.5,
      visible: this._isAcceptNode
    });

    this.nodeLabel = new Konva.Text({
      x: (-NodeWrapper.NodeRadius * 2 * 0.75) / 2,
      y: (-NodeWrapper.NodeRadius * 2 * 0.75) / 2,
      width: NodeWrapper.NodeRadius * 2 * 0.75,
      height: NodeWrapper.NodeRadius * 2 * 0.75,
      align: 'center',
      verticalAlign: 'middle',
      text: this._labelText,
      fontSize: 15,
      fill: StateManager.colorScheme.nodeLabelColor,
    });

    this.nodeGroup.add(this.nodeBackground);
    this.nodeGroup.add(this.nodeAcceptCircle);
    this.nodeGroup.add(this.nodeLabel);

    this.nodeGroup.draggable(true);

    // TODO: figure out how to get this to activate when in drag operation
    // https://konvajs.org/docs/drag_and_drop/Drop_Events.html
    this.nodeGroup.on('mouseenter', (ev) => this.onMouseEnter.call(this, ev));
    this.nodeGroup.on('mouseleave', (ev) => this.onMouseLeave.call(this, ev));

    this.nodeGroup.on('click', (ev) => this.onClick.call(this, ev));
    this.nodeGroup.on('dragstart', (ev) => this.onDragStart.call(this, ev));
    this.nodeGroup.on('dragmove', (ev) => this.onDragMove.call(this, ev));
    this.nodeGroup.on('dragend', (ev) => this.onDragEnd.call(this, ev));
  }

  /**
   * Adjusts the font size of the node's label so that the text fits within the
   * node.
   */
  public adjustFontSize() {
    const maxTextWidth = NodeWrapper.NodeRadius * 2 * 0.75; // 75% of the diameter (inner circle is 80% of diameter)
    let fontSize = this.nodeLabel.fontSize();

    const tempText = new Konva.Text({
      text: this._labelText,
      fontSize: fontSize,
    });

    // measure text width with current font size
    let textWidth = tempText.getClientRect().width;

    if (textWidth > maxTextWidth && fontSize > 10) {
      while (textWidth > maxTextWidth && fontSize > 10) { // minimum font size is 10
        fontSize -= 1; // decrement font size
        tempText.fontSize(fontSize); // update tempText font size
        textWidth = tempText.getClientRect().width; // remeasure text width with new font size
      }
    }
    else if (textWidth < maxTextWidth && fontSize < 15) {
      // Increase font size until the text fits within the maximum width
      while (textWidth < maxTextWidth && fontSize < 15) {
        fontSize += 1; // increment font size
        tempText.fontSize(fontSize);
        textWidth = tempText.getClientRect().width;
      }
    }

    this.nodeLabel.fontSize(fontSize);
    this.nodeLabel.wrap('word');
    this.nodeLabel.align('center');
    this.nodeLabel.verticalAlign('middle');
  }

  /**
   * Handles the node being clicked. This means selecting the node, and
   * deselecting all other nodes if the user isn't holding the shift key.
   * @param ev
   */
  public onClick(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Select) {
      // If shift isn't being held, then clear all previous selection
      if (!ev.evt.shiftKey) {
        StateManager.deselectAllObjects();
      }
      StateManager.selectObject(this);
    }
  }

  /**
   * Updates the appearance of the node to be selected (i.e., in light mode, the
   * node has a blue outline).
   */
  public select() {
    this.nodeBackground.stroke(StateManager.colorScheme.selectedNodeStrokeColor);
    this.nodeBackground.strokeWidth(NodeWrapper.SelectedStrokeWidth);
  }

  /**
   * Updates the appearance of the node to be unselected (i.e., in light mode,
   * the node has a black outline).
   */
  public deselect() {
    this.nodeBackground.stroke(StateManager.colorScheme.nodeStrokeColor);
    this.nodeBackground.strokeWidth(NodeWrapper.StrokeWidth);
  }

  /**
   * Deletes the Konva group that visualizes this node.
   * 
   * **NOTE:** If they are destroyed, they will need to be recreated next time
   * we want to place them on the canvas. Chances are this shouldn't need
   * to be called.
   */
  public deleteKonvaObjects() {
    this.nodeGroup.destroy();
  }

  /** Checks if this node is an accepting node. */
  public get isAcceptNode(): boolean {
    return this._isAcceptNode;
  }

  /** Sets this node to be an accepting or rejecting node. */
  public set isAcceptNode(value: boolean) {
    const prev = this._isAcceptNode;
    this._isAcceptNode = value;
    if (this._isAcceptNode) {
      this.nodeAcceptCircle.visible(true);
    }
    else {
      this.nodeAcceptCircle.visible(false);
    }
  }

  /** Toggles the state of this node between accepting and rejecting. */
  public toggleAcceptNode() {
    this.isAcceptNode = !this._isAcceptNode;
  }


  /**
   * Updates the appearance of the node to indicate that a transition is being
   * dragged towards it.
   */
  public enableNewConnectionGlow() {
    this.nodeBackground.shadowColor(StateManager.colorScheme.newConnectionGlowColor);
    this.nodeBackground.shadowOffset({ x: 0, y: 0 });
    this.nodeBackground.shadowOpacity(StateManager.colorScheme.newConnectionShadowOpacity);
    this.nodeBackground.shadowBlur(StateManager.colorScheme.newConnectionShadowBlur);
    this.nodeBackground.shadowEnabled(true);
  }

  /**
   * Disables the drop shadow effect on this node, used to indicate it is being
   * "set down" by the user.
   */
  public disableShadowEffects() {
    this.nodeBackground.shadowEnabled(false);
  }

  /**
   * Enables the drop shadow effect on this node, used to indicate it is being
   * "picked up" by the user.
   */
  public enableDragDropShadow() {
    this.nodeBackground.shadowColor(StateManager.colorScheme.nodeDragDropShadowColor);
    this.nodeBackground.shadowOffset({ x: 0, y: 3 });
    this.nodeBackground.shadowOpacity(StateManager.colorScheme.nodeDragDropShadowOpacity);
    this.nodeBackground.shadowBlur(StateManager.colorScheme.nodeDragDropShadowBlur);
    this.nodeBackground.shadowEnabled(true);
  }

  /**
   * Called whenever the user's mouse enters the node. This is used to
   * highlight the node when it becomes a candidate for having a transition
   * added to it.
   * @param ev 
   */
  public onMouseEnter(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Transitions && StateManager.tentativeTransitionInProgress) {
      StateManager.tentativeTransitionTarget = this;
      this.enableNewConnectionGlow();
    }
  }

  /**
   * Called whenever the user's mouse leaves the node. This is used to
   * unhighlight the node when it's no longer a candidate for having a
   * transition added to it.
   * @param ev
   */
  public onMouseLeave(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Transitions) {
      if (StateManager.tentativeTransitionInProgress && StateManager.tentativeTransitionTarget === this) {
        StateManager.tentativeTransitionTarget = null;
        this.disableShadowEffects();
      }
    }
  }

  /**
   * Called whenever the user starts dragging a node.
   * @param ev 
   */
  public onDragStart(ev: Konva.KonvaEventObject<MouseEvent>) {
    this.lastPos = this.nodeGroup.position();

    // No dragging when in state mode!
    if (StateManager.currentTool === Tool.States) {
      this.nodeGroup.stopDrag();
    }
    else if (StateManager.currentTool === Tool.Transitions) {
      StateManager.startTentativeTransition(this);
    }
    else if (StateManager.currentTool === Tool.Select) {
      if (!ev.evt.shiftKey && StateManager.selectedObjects.length === 1) {
        StateManager.deselectAllObjects();
      }
      StateManager.selectObject(this);

      StateManager.selectedObjects.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          obj.enableDragDropShadow();
        }
      });

      StateManager.startDragStatesOperation(this.lastPos);
    }
  }

  /**
   * Called whenever a node is dragged. All other selected objects are moved
   * along with the node.
   * 
   * If the current tool is the Transition tool, then the tentative transition
   * head is moved instead.
   * @param ev
   */
  public onDragMove(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool == Tool.Transitions) {
      this.nodeGroup.position(this.lastPos);
      StateManager.updateTentativeTransitionHead(ev.evt.pageX, ev.evt.pageY);
    }
    else if (StateManager.currentTool === Tool.Select) {
      this.konvaObject().fire('move', ev);

      // Move all selected objects along with this one!
      const allOtherSelected = StateManager.selectedObjects.filter((i) => i !== this);
      allOtherSelected.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          obj.konvaObject().position({
            x: obj.konvaObject().position().x + ev.evt.movementX,
            y: obj.konvaObject().position().y + ev.evt.movementY
          });
          obj.konvaObject().fire('move', ev);
        }
      });
    }
  }

  /**
   * Sets the node to have a new position.
   * @param position The new position to set the node to.
   */
  public setPosition(position: Vector2d) {
    this.nodeGroup.position(position);
  }

  /**
   * Called when the user releases a node from being dragged.
   * The node's position is snapped to the grid, if "Snap to Grid" is enabled,
   * and then the movement is added to the action stack.
   */
  public onDragEnd() {
    if (StateManager.currentTool === Tool.States) {
    }
    else if (StateManager.currentTool === Tool.Select && StateManager.snapToGridEnabled) {

      let selected = StateManager.selectedObjects;
      let nodes = selected.filter(obj => obj instanceof NodeWrapper);

      let snappedPos: Vector2d = { x: 0, y: 0 };

      nodes.forEach(node => {
        let snapped = (node as NodeWrapper).snapToGrid();
        if (node === this)
          snappedPos = snapped;
      });

      StateManager.updateStartNodePosition();

      // only add the move to the action stack if our snapped position changed
      if (Math.abs(this.lastSnappedPos.x - snappedPos.x) > 1e-5 || 
          Math.abs(this.lastSnappedPos.y - snappedPos.y) > 1e-5) {
        this.lastSnappedPos = snappedPos;
        StateManager.completeDragStatesOperation(this.nodeGroup.position());
      }
    } else if (StateManager.currentTool === Tool.Transitions) {
      // Handling specific to ending a tentative transition
      StateManager.endTentativeTransition();
    } else if (StateManager.currentTool === Tool.Select) {
      // Deselect and remove shadow effects from all selected nodes
      StateManager.selectedObjects.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          obj.disableShadowEffects();
        }
      });

      StateManager.completeDragStatesOperation(this.nodeGroup.position());
    }
  }

  /**
   * Snaps the position of this node to the nearest grid point.
   * @returns {Vector2d} The new snapped position of the node.
   */
  public snapToGrid(): Vector2d {
    // Get the node's current position relative to the stage
    const nodePos = this.nodeGroup.position();

    // Snap the position to the nearest grid points
    const gridCellSize = 50;
    let snappedX = Math.round(nodePos.x / gridCellSize) * gridCellSize;
    let snappedY = Math.round(nodePos.y / gridCellSize) * gridCellSize;

    // Adjust the snapped position by the scale to get the final position on the stage
    this.setPosition({
      x: snappedX,
      y: snappedY
    });

    // update all related transitions
    StateManager.transitions.forEach(transition => {
      if (transition.involvesNode(this)) {
        transition.updatePoints();
      }
    });

    // Redraw the layer to reflect the changes
    this.nodeGroup.getLayer()?.batchDraw();

    return { x: snappedX, y:snappedY };
  }

  /**
   * Returns the Konva group that visualizes this node.
   * @returns {Konva.Node}
   */
  public konvaObject(): Konva.Node {
    return this.nodeGroup;
  }

  /** Gets the text that this node is labeled with. */
  public get labelText(): string {
    return this._labelText;
  }

  /** Sets the text that this node is labeled with. */
  public set labelText(value: string) {
    this._labelText = value;
    this.nodeLabel.text(this._labelText);
    this.adjustFontSize();
  }

  /** Updates the node to match the current color scheme (light/dark mode). */
  public updateColorScheme() {
    this.nodeBackground.fill(StateManager.colorScheme.nodeFill);


    this.nodeBackground.stroke(StateManager.colorScheme.nodeStrokeColor);
    this.nodeAcceptCircle.stroke(StateManager.colorScheme.nodeAcceptStrokeColor);
    this.nodeLabel.fill(StateManager.colorScheme.nodeLabelColor);
  }

//UI of error node
public setErrorState(isError: boolean) {
  // Remove existing error elements (if they exist) to avoid duplicates
  this.nodeGroup.find('.errorIcon, .errorText').forEach((el) => el.destroy());

  if (isError) {
      // Set a light red fill color for the node background
      this.nodeBackground.fill('rgb(254, 226, 225)'); // Light red

      // Set the border color and width for emphasis
      this.nodeBackground.stroke('rgb(220, 38, 37)'); //Dark red
      this.nodeBackground.strokeWidth(4);

      // Create an "X" icon 
      const errorIcon = new Konva.Circle({
          x: 0,
          y: NodeWrapper.NodeRadius - 1, 
          radius: 10,
          fill: 'rgb(220, 38, 37)',
          name: 'errorIcon', // Add a name for easy removal
      });

      const errorText = new Konva.Text({
          text: '✕',
          fontSize: 14, 
          fill: 'white',
          align: 'center',
          verticalAlign: 'middle',
          width: 20, 
          height: 20, 
          name: 'errorText', // Add a name for easy removal
      });

      // Center the text inside the circle
      errorText.offsetX(errorText.width() / 2);
      errorText.offsetY(errorText.height() / 2);

      // Position the text directly over the errorIcon
      errorText.position({
          x: 0,
          y: NodeWrapper.NodeRadius - 1,
      });

      // Add the icon and text to the node group
      this.nodeGroup.add(errorIcon);
      this.nodeGroup.add(errorText);
  } else {
      // Reset the fill color to the default
      this.nodeBackground.fill(StateManager.colorScheme.nodeFill);
      this.nodeBackground.stroke(StateManager.colorScheme.nodeStrokeColor);
      this.nodeBackground.strokeWidth(NodeWrapper.StrokeWidth);
  }

  // Redraw the layer to apply changes
  this.nodeGroup.getLayer()?.batchDraw();
}

}