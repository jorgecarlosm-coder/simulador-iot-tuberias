
import streamlit as st
import numpy as np
import pandas as pd
import plotly.express as px

# Configuracion de la pagina
st.set_page_config(
    page_title="Simulador IoT de Tuberias",
    page_icon="🔧",
    layout="wide"
)

# Titulo
st.title("Simulador de fallas en tuberias mediante IoT")

st.write(
    "Aplicacion para analizar el comportamiento hidraulico, "
    "termico y la deteccion de fallas en tuberias."
)

st.divider()

# Menu lateral
st.sidebar.header("Configuracion fisica")

longitud = st.sidebar.number_input(
    "Longitud de tuberia (m)",
    min_value=1.0,
    value=100.0
)

diametro = st.sidebar.number_input(
    "Diametro interno (m)",
    min_value=0.001,
    value=0.05,
    format="%.3f"
)

caudal = st.sidebar.number_input(
    "Caudal de entrada (m3/s)",
    min_value=0.0001,
    value=0.001,
    format="%.4f"
)

temperatura = st.sidebar.number_input(
    "Temperatura de entrada (°C)",
    value=60.0
)

temperatura_ambiente = st.sidebar.number_input(
    "Temperatura ambiente (°C)",
    value=20.0
)

# Calculos iniciales
area = np.pi * diametro**2 / 4
velocidad = caudal / area

# Resultados
st.subheader("Variables fisicas iniciales")

col1, col2, col3 = st.columns(3)

col1.metric("Area transversal", f"{area:.5f} m²")
col2.metric("Velocidad", f"{velocidad:.3f} m/s")
col3.metric("Temperatura de entrada", f"{temperatura:.1f} °C")

st.divider()

# Secciones del simulador
tab1, tab2, tab3, tab4 = st.tabs([
    "H1 - Ruido",
    "H2 - Muestreo",
    "H3 - Sensores",
    "H4 - Tipos de fallas"
])

with tab1:
    st.subheader("Hipotesis H1")
    st.write("Comparacion de metodos de deteccion frente al ruido.")

with tab2:
    st.subheader("Hipotesis H2")
    st.write("Analisis del intervalo de muestreo y retardo de deteccion.")

with tab3:
    st.subheader("Hipotesis H3")
    st.write("Analisis de la cantidad de sensores y localizacion de fallas.")

with tab4:
    st.subheader("Hipotesis H4")
    st.write("Comparacion de fallas hidraulicas y termicas.")
