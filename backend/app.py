"""Flask API for the skincare routine checker."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from storage import save_routine_log

app = Flask(__name__)
CORS(app)  # Lets the React app (different port) talk to this server


@app.route("/api/routine/today", methods=["POST"])
def save_today_routine():
    """Receive checked products from the frontend and save them."""
    data = request.get_json()

    if data is None or "products" not in data:
        return jsonify({"error": "Missing 'products' in request body"}), 400

    products = data["products"]

    if not isinstance(products, list):
        return jsonify({"error": "'products' must be a list"}), 400

    save_routine_log(products)

    return jsonify({"message": "Routine saved for today."})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
