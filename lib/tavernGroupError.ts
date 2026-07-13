export class TavernGroupError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "TAVERN_ERROR") {
    super(message);
    this.name = "TavernGroupError";
    this.status = status;
    this.code = code;
  }
}
