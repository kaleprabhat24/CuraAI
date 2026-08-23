from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from PIL import Image
import tensorflow as tf
import numpy as np
import io
from typing import Annotated


# ============================================================
# APP
# ============================================================

app = FastAPI(title="CureAI")


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# LOAD MODEL
# ============================================================

MODEL_PATH = "../model/cureai_chest_xray_model.keras"

model = tf.keras.models.load_model(MODEL_PATH)

print("CureAI model loaded successfully!")


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "CureAI API is running"
    }


# ============================================================
# SINGLE X-RAY
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    image_bytes = await file.read()

    image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    image = image.resize((224, 224))

    image_array = np.array(
        image,
        dtype=np.float32
    )

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    probability = float(
        model.predict(
            image_array,
            verbose=0
        )[0][0]
    )

    if probability >= 0.5:

        prediction = "PNEUMONIA"
        confidence = probability

    else:

        prediction = "NORMAL"
        confidence = 1 - probability

    return {
        "prediction": prediction,
        "confidence": round(
            confidence * 100,
            2
        ),
        "pneumonia_probability": round(
            probability * 100,
            2
        )
    }


# ============================================================
# BATCH X-RAY
# ============================================================

@app.post("/predict-batch")
async def predict_batch(
    files: Annotated[
        list[UploadFile],
        File(
            description="Upload up to 20 chest X-ray images"
        )
    ]
):

    # --------------------------------------------------------
    # CHECK NUMBER OF FILES
    # --------------------------------------------------------

    if len(files) == 0:

        return {
            "error": "Please upload at least one X-ray."
        }

    if len(files) > 20:

        return {
            "error": "Maximum 20 X-rays allowed."
        }


    # --------------------------------------------------------
    # STORE RESULTS
    # --------------------------------------------------------

    results = []


    # --------------------------------------------------------
    # PROCESS EACH X-RAY
    # --------------------------------------------------------

    for file in files:

        try:

            # Read image
            image_bytes = await file.read()

            # Open image
            image = Image.open(
                io.BytesIO(image_bytes)
            ).convert("RGB")

            # Resize
            image = image.resize(
                (224, 224)
            )

            # Convert to NumPy
            image_array = np.array(
                image,
                dtype=np.float32
            )

            # Add batch dimension
            image_array = np.expand_dims(
                image_array,
                axis=0
            )

            # Model prediction
            probability = float(
                model.predict(
                    image_array,
                    verbose=0
                )[0][0]
            )


            # ------------------------------------------------
            # CLASSIFICATION
            # ------------------------------------------------

            if probability >= 0.5:

                prediction = "PNEUMONIA"
                confidence = probability

            else:

                prediction = "NORMAL"
                confidence = 1 - probability


            # ------------------------------------------------
            # PRIORITY
            # ------------------------------------------------

            pneumonia_percentage = round(
                probability * 100,
                2
            )


            if pneumonia_percentage >= 70:

                priority = "HIGH"

            elif pneumonia_percentage >= 40:

                priority = "MEDIUM"

            else:

                priority = "LOW"


            # ------------------------------------------------
            # SAVE RESULT
            # ------------------------------------------------

            results.append({

                "filename": file.filename,

                "prediction": prediction,

                "confidence": round(
                    confidence * 100,
                    2
                ),

                "pneumonia_probability":
                    pneumonia_percentage,

                "priority":
                    priority,

                "priority_score":
                    pneumonia_percentage

            })


        except Exception as e:

            results.append({

                "filename": file.filename,

                "prediction": "ERROR",

                "confidence": 0,

                "pneumonia_probability": 0,

                "priority": "ERROR",

                "priority_score": 0,

                "error": str(e)

            })


    # ========================================================
    # SORT BY PRIORITY
    # ========================================================

    results.sort(
        key=lambda x: x["pneumonia_probability"],
        reverse=True
    )


    # ========================================================
    # ASSIGN RANK
    # ========================================================

    for index, result in enumerate(results):

        result["rank"] = index + 1


    # ========================================================
    # RETURN RESULTS
    # ========================================================

    return {

        "total_images": len(results),

        "results": results

    }


# ============================================================
# CUSTOM OPENAPI
# Fix Swagger file upload display
# ============================================================

def custom_openapi():

    if app.openapi_schema:

        return app.openapi_schema


    schema = get_openapi(

        title=app.title,

        version="1.0.0",

        description="CureAI Chest X-ray Analysis API",

        routes=app.routes

    )


    for schema_data in schema.get(
        "components",
        {}
    ).get(
        "schemas",
        {}
    ).values():

        properties = schema_data.get(
            "properties",
            {}
        )


        for prop in properties.values():

            # Multiple files
            if prop.get("type") == "array":

                items = prop.get(
                    "items",
                    {}
                )

                if items.get(
                    "contentMediaType"
                ) == "application/octet-stream":

                    items.pop(
                        "contentMediaType",
                        None
                    )

                    items["format"] = "binary"


            # Single file
            elif prop.get(
                "contentMediaType"
            ) == "application/octet-stream":

                prop.pop(
                    "contentMediaType",
                    None
                )

                prop["format"] = "binary"


    app.openapi_schema = schema

    return app.openapi_schema


app.openapi = custom_openapi