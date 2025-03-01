import { v4 as uuidv4 } from "uuid";
import { SerializableToken } from "./StateManager";

/**
 * The class that holds token information and acts as a persistent reference
 * to a given token, even when the token's label is changed.
 */
export default class TokenWrapper {
  /**
   * The human-readable symbol that this token represents in input strings.
   * This should only be one character long.
   */
  public symbol: string;

  private readonly _id: string;

  /**
   * A unique ID which persists for this token even when the token's visible
   * symbol is changed. Useful for serialization and deserialization to maintain
   * references.
   */
  public get id() {
    return this._id;
  }

  /**
   * Constructs a new token wrapper.
   * @param symbol The human-readable symbol that this token represents.
   * If not specified or set to `null`, it will default to an empty string.
   * @param {string | null} [id] The unique ID which will persist when the
   * symbol is changed.
   * This will be autogenerated by default, which is fine when building new
   * automata. However, if you are loading an existing automaton, this ID is
   * how you will maintain relationships between this token and the nodes
   * and transitions that reference it.
   */
  constructor(symbol: string | null = null, id: string | null = null) {
    this._id = id ?? uuidv4();
    this.symbol = symbol ?? "";
  }

  /**
   * Converts this token wrapper into an object that can be serialized.
   * @returns {SerializableToken} A serializable token object.
   */
  public toSerializable(): SerializableToken {
    return {
      id: this.id,
      symbol: this.symbol,
    };
  }
}
