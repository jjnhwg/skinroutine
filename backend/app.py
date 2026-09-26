"""Flask API for the skincare routine checker."""

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from requests import RequestException

from product_search import fetch_image, search_products
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


@app.route("/api/products/search")
def search_product_catalog():
    """Find real products, with photos, for the catalog's online search."""
    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify({"error": "Search needs at least 2 characters"}), 400

    return jsonify({"products": search_products(query)})


@app.route("/api/products/image")
def proxy_product_image():
    """Pass a product photo through, so the browser can resize and keep it.

    Loading it from the shop directly would taint the canvas we shrink it on.
    """
    url = request.args.get("url", "")

    try:
        data, content_type = fetch_image(url)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RequestException:
        return jsonify({"error": "Couldn't download the image"}), 502

    return Response(data, content_type=content_type)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
