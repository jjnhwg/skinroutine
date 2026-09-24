/** Shape of the data we send to Flask when saving today's routine */
export interface SaveRoutineRequest {
  products: string[];
}

/** Shape of the response Flask sends back after a successful save */
export interface SaveRoutineResponse {
  message: string;
}
