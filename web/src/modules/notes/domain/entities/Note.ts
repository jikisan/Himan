export class Note {
  constructor(
    public readonly id: string,
    public title: string,
    public content: string,
    public excerpt: string,
    public folderId: string | null,
    public readonly userId: string,
    public isPinned: boolean,
    public tags: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static create(params: {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    folderId: string | null;
    userId: string;
    isPinned: boolean;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }): Note {
    return new Note(
      params.id,
      params.title,
      params.content,
      params.excerpt,
      params.folderId,
      params.userId,
      params.isPinned,
      params.tags,
      params.createdAt,
      params.updatedAt
    );
  }

  updateContent(title: string, content: string, excerpt: string): void {
    this.title = title;
    this.content = content;
    this.excerpt = excerpt;
  }

  moveToFolder(folderId: string | null): void {
    this.folderId = folderId;
  }

  togglePin(): void {
    this.isPinned = !this.isPinned;
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }
}
