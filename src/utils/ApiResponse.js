// Express do not provide any classes to handle api response but we can create it for convenience

class ApiResponse {
  constructor(statusCode, data, message = "Success") { 
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };