import Konva from "konva";
import StateManager from "./StateManager";
import { Tool } from "./Tool";
import { Vector2d } from "konva/lib/types";
import SelectableObject from "./SelectableObject";
import { v4 as uuidv4 } from "uuid";

export default class CommentRegion extends SelectableObject {
  // make the color configurable later
  public static readonly FillColor = "rgba(255, 191, 0, 0.5)";
  public static readonly StrokeColor = "rgb(255, 191, 0)";
  public static readonly CornerRadius = 8;
  public static readonly StrokeWidth = 4;
  public static readonly SelectedstrokeWidth = 6;
  public static readonly InitialWidth = 300;
  public static readonly InitialHeight = 300;
  public static readonly FontSize = 20;
  public static readonly FontPadding = 5;
  public static readonly CommentRectMargin = 8;

  private commentText: Konva.Text;
  private commentRect: Konva.Rect;
  private regionRect: Konva.Rect;

  public nodeGroup: Konva.Group;

  // eventually add another editor that changes the text
  private _comment: string = "Comment Region";
  private readonly _id: string;

  constructor(label: string | null = null, id: string | null = null) {
    super();
    this._comment = label ?? this._comment;
    this._id = id ?? uuidv4();
  }

  public get id(): string {
    return this._id;
  }

  public get comment(): string {
    return this._comment;
  }

  public set comment(newComment: string) {
    this._comment = newComment;
  }

  public createKonvaObjects(x: number, y: number, w: number, h: number) {
    this.nodeGroup = new Konva.Group({ x: x, y: y });

    this.regionRect = new Konva.Rect({
      x: 0,
      y: 0,
      cornerRadius: CommentRegion.CornerRadius,
      fill: CommentRegion.FillColor,
      stroke: CommentRegion.StrokeColor,
      strokeWidth: CommentRegion.StrokeWidth,
      width: w,
      height: h,
    });

    this.commentText = new Konva.Text({
      x: 0,
      y: 0,
      align: "left",
      verticalAlign: "middle",
      text: this.comment,
      fontSize: CommentRegion.FontSize,
      fill: "black", // make it black or white depending on background color
      padding: CommentRegion.FontPadding,
    });

    if (this.commentText.width() > w) this.commentText.width(w);

    this.commentText.y(
      -this.commentText.height() - CommentRegion.CommentRectMargin,
    );

    this.commentRect = new Konva.Rect({
      x: 0,
      y: this.commentText.y(),
      cornerRadius: CommentRegion.CornerRadius,
      fill: CommentRegion.FillColor,
      stroke: CommentRegion.StrokeColor,
      strokeWidth: CommentRegion.StrokeWidth,
      width: this.commentText.width(),
      height: this.commentText.height(),
    });

    // Add elements to the node group in order
    this.nodeGroup.add(this.regionRect);
    this.nodeGroup.add(this.commentRect);
    this.nodeGroup.add(this.commentText);

    this.nodeGroup.draggable(true);

    // Event listeners
    this.nodeGroup.on("click", (ev) => this.onClick.call(this, ev));
    this.nodeGroup.on("dragstart", (ev) => this.onDragStart.call(this, ev));
    this.nodeGroup.on("dragmove", (ev) => this.onDragMove.call(this, ev));
    this.nodeGroup.on("dragend", (ev) => this.onDragEnd.call(this, ev));
  }

  public select(): void {
    this.commentRect.strokeWidth(CommentRegion.SelectedstrokeWidth);
    this.commentRect.stroke(StateManager.colorScheme.selectedNodeStrokeColor);

    this.regionRect.strokeWidth(CommentRegion.SelectedstrokeWidth);
    this.regionRect.stroke(StateManager.colorScheme.selectedNodeStrokeColor);
  }

  public deselect(): void {
    this.commentRect.strokeWidth(CommentRegion.StrokeWidth);
    this.commentRect.stroke(CommentRegion.StrokeColor);

    this.regionRect.strokeWidth(CommentRegion.StrokeWidth);
    this.regionRect.stroke(CommentRegion.StrokeColor);
  }

  public get konvaObject(): Konva.Node {
    return this.nodeGroup;
  }

  public deleteKonvaObjects(): void {
    this.nodeGroup.destroy();
  }

  public onClick(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Select) {
      // If shift isn't being held, then clear all previous selection
      if (!ev.evt.shiftKey) {
        StateManager.deselectAllObjects();
      }
      StateManager.selectObject(this);
    }
  }

  public onDragStart(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool !== Tool.Select) {
      this.nodeGroup.stopDrag();
      return;
    }

    StateManager.selectObject(this);
    // make an equivalent function for the comment region (to be undo/redo safe)
    // StateManager.startDragStatesOperation(this.lastPos);
  }

  public onDragMove(ev: Konva.KonvaEventObject<MouseEvent>) {
    // only necessary if i want to multi select comments
  }

  public onDragEnd(ev: Konva.KonvaEventObject<MouseEvent>) {
    // make an equivalent function for the comment region (to be undo/redo safe)
    // StateManager.completeDragStatesOperation(this.nodeGroup.position());
  }
}
