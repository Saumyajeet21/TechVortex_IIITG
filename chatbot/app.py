from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")

client = Groq(api_key=GROQ_API_KEY)

instruction = (
    "You are an expert Ocean, Weather, and Climate Scientist with deep research experience. "
    "You answer questions related to: oceans, seas, marine life, fish, sharks, whales, dolphins, "
    "jellyfish, octopus, squid, sea turtles, penguins, seabirds, coral reefs, mangroves, "
    "seagrass, kelp forests, deep sea creatures, bioluminescence, ocean currents, tides, waves, "
    "tsunamis, sea level rise, ocean temperatures, ocean acidification, salinity, "
    "climate change, global warming, greenhouse gases, carbon cycle, ice caps, glaciers, "
    "arctic, antarctic, weather patterns, storms, hurricanes, cyclones, typhoons, tornadoes, "
    "thunder, lightning, rainfall, snowfall, hail, fog, monsoons, droughts, floods, heatwaves, "
    "atmospheric science, cloud formation, wind patterns, jet streams, seasons, humidity, "
    "air pressure, UV radiation, ozone layer, ocean pollution, plastic waste, oil spills, "
    "marine conservation, endangered species, overfishing, biodiversity, food chains, "
    "photosynthesis in oceans, plankton, algae, and geography of all water bodies. "

    "If the question is completely unrelated to all of the above topics such as cricket, "
    "movies, coding, politics, cooking, finance, or sports, respond with exactly: "
    "'I specialize in ocean, weather, and climate science. Please ask me something related to that!' "

    "If real-time weather data is provided, present it clearly and add brief scientific "
    "climate context about why that region experiences such weather. "

    "RESPONSE FORMAT RULES — follow strictly: "
    "1. For questions asking to LIST or NAME things (e.g. 'list fishes', 'types of storms', "
    "'name ocean currents') — respond ONLY in bullet points, no paragraphs. "
    "2. For questions asking HOW or WHY (e.g. 'how do tides work', 'why is the ocean salty') — "
    "respond with 2-3 sentence paragraph only, no bullet points. "
    "3. For questions asking WHAT with detail (e.g. 'what is climate change', 'what causes tsunamis') — "
    "start with 1 direct answer sentence, then 1 short paragraph of 2 sentences, "
    "then 3 bullet points of specific facts. "
    "4. For weather data questions — give current data first, then 2-3 sentences of climate context. "
    "5. Never mix formats unnecessarily. Never repeat the same point. "
    "Keep all responses under 160 words. Be specific, factual, and precise."

    "1. For questions asking to LIST or NAME things (e.g. 'list fishes', 'types of storms', "
    "'name ocean currents') — always start with a heading line like 'The fishes found in the ocean are:' "
    "or 'The types of storms are:' based on the question, then list items as bullet points. "
    "Never start directly with bullet points without a heading. "
)

def get_weather(city):
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        if data.get("cod") != 200:
            return None
        return {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"]
        }
    except:
        return None

def is_weather_question(text):
    weather_keywords = [
        "temperature", "weather", "temp", "humid", "rainfall",
        "forecast", "climate of", "hot in", "cold in", "raining in",
        "weather in", "temperature in", "how hot", "how cold"
    ]
    return any(keyword in text.lower() for keyword in weather_keywords)

def extract_city(text):
    words = text.lower().split()
    if "in" in words:
        idx = words.index("in")
        if idx + 1 < len(words):
            return " ".join(words[idx + 1:]).strip("?.")
    return words[-1].strip("?.")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_response', methods=['POST'])
def get_response():
    user_input = request.json.get("message")

    if is_weather_question(user_input):
        city = extract_city(user_input)
        weather = get_weather(city)
        if weather:
            final_input = (
                f"User asked: '{user_input}'. "
                f"Live weather for {weather['city']}, {weather['country']}: "
                f"{weather['temp']}°C (feels like {weather['feels_like']}°C), "
                f"Humidity: {weather['humidity']}%, "
                f"Conditions: {weather['description']}, "
                f"Wind: {weather['wind_speed']} m/s. "
                f"Answer using this data with brief climate context."
            )
        else:
            final_input = user_input
    else:
        final_input = user_input

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": instruction},
                {"role": "user", "content": final_input}
            ],
            temperature=0.3,
            max_tokens=300
        )

        reply = response.choices[0].message.content
        return jsonify({"reply": reply})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False, port=5000, use_reloader=False)