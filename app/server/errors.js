// An error whose message is safe to show to the person using the app.
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
