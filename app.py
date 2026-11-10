
import streamlit as st
import pandas as pd

from modelos.modelo_hidraulico import modelo_hidraulico

st.set_page_config(
    page_title="Simulador IoT de tuberias",
    page_icon="🔧",
    layout="wide"
)

st.title("Simulador IoT de tuberias")
st.write("Modelo hidraulico: calculo de variables del flujo.")

st.sidebar.header("Parametros fisicos")

# Geometria
longitud = st.sidebar.number_input(
    "Longitud (m)", min_value=1.0, value=100.0
)

diametro = st.sidebar.number_input(
    "Diametro interno (m)",
    min_value=0.001,
    value=0.05,
    format="%.3f"
)

# Flujo
caudal = st.sidebar.number_input(
    "Caudal (m3/s)",
    min_value=0.000001,
    value=0.001,
    format="%.6f"
)

presion_entrada = st.sidebar.number_input(
    "Presion de entrada (Pa)",
    min_value=1.0,
    value=300000.0
)

# Propiedades del agua
rho = st.sidebar.number_input(
    "Densidad (kg/m3)",
    value=998.2
)

mu = st.sidebar.number_input(
    "Viscosidad dinamica (Pa s)",
    value=0.001002,
    format="%.6f"
)

rugosidad = st.sidebar.number_input(
    "Rugosidad (m)",
    value=0.0000015,
    format="%.8f"
)

# Validacion
if diametro <= 0 or caudal <= 0 or longitud <= 0:
    st.error("Los valores deben ser positivos.")

elif rho <= 0 or mu <= 0 or rugosidad < 0:
    st.error("Revisa las propiedades del fluido y la rugosidad.")

else:

    resultados = modelo_hidraulico(
        longitud=longitud,
        diametro=diametro,
        caudal=caudal,
        presion_entrada=presion_entrada,
        rho=rho,
        mu=mu,
        rugosidad=rugosidad
    )

    st.subheader("Resultados del modelo hidraulico")

    col1, col2, col3 = st.columns(3)

    col1.metric(
        "Area transversal",
        f"{resultados['area']:.6f} m2"
    )

    col2.metric(
        "Velocidad",
        f"{resultados['velocidad']:.4f} m/s"
    )

    col3.metric(
        "Numero de Reynolds",
        f"{resultados['reynolds']:.2f}"
    )

    col4, col5, col6 = st.columns(3)

    col4.metric(
        "Regimen de flujo",
        resultados["regimen"]
    )

    col5.metric(
        "Factor de friccion",
        f"{resultados['factor_friccion']:.6f}"
    )

    col6.metric(
        "Perdida de presion",
        f"{resultados['perdida_presion'] / 1000:.4f} kPa"
    )

    st.divider()

    st.subheader("Presiones de la tuberia")

    st.metric(
        "Presion de salida",
        f"{resultados['presion_salida']:.2f} Pa"
    )

    tabla = pd.DataFrame({
        "Variable": [
            "Area",
            "Velocidad",
            "Reynolds",
            "Regimen",
            "Factor de friccion",
            "Perdida de presion",
            "Presion de salida"
        ],
        "Resultado": [
            resultados["area"],
            resultados["velocidad"],
            resultados["reynolds"],
            resultados["regimen"],
            resultados["factor_friccion"],
            resultados["perdida_presion"],
            resultados["presion_salida"]
        ]
    })

    st.subheader("Tabla de resultados")
    st.dataframe(tabla, use_container_width=True)
