export class Folder {
  constructor(
    public readonly id: string,
    public name: string,
    public color?: string,
    public icon?: string,
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public noteCount?: number
  ) {}

  static create(params: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    noteCount?: number;
  }): Folder {
    return new Folder(
      params.id,
      params.name,
      params.color,
      params.icon,
      params.userId,
      params.createdAt,
      params.updatedAt,
      params.noteCount
    );
  }

  updateName(name: string): void {
    this.name = name;
  }

  updateColor(color?: string): void {
    this.color = color;
  }
}
