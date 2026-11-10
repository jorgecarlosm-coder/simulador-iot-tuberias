
import math
import numpy as np


# Perfiles iniciales ilustrativos.
# Deben ajustarse y justificarse con bibliografia.

PERFILES_RED = {
    "lorawan": {
        "nombre": "LoRaWAN estrella",
        "alcance_km": 5.0,
        "pdr_base": 0.95,
        "latencia_base_ms": 800,
        "latencia_salto_ms": 0,
        "saltos": 1,
        "corriente_tx_mA": 100,
        "corriente_rx_mA": 30,
        "corriente_reposo_mA": 0.01,
        "tiempo_paquete_s": 0.2
    },

    "lora_mesh": {
        "nombre": "LoRa Mesh",
        "alcance_km": 3.2,
        "pdr_base": 0.95,
        "latencia_base_ms": 300,
        "latencia_salto_ms": 100,
        "saltos": 1,
        "corriente_tx_mA": 100,
        "corriente_rx_mA": 30,
        "corriente_reposo_mA": 0.02,
        "tiempo_paquete_s": 0.2
    },

    "wifi": {
        "nombre": "Wi-Fi estrella",
        "alcance_km": 0.1,
        "pdr_base": 0.98,
        "latencia_base_ms": 30,
        "latencia_salto_ms": 0,
        "saltos": 1,
        "corriente_tx_mA": 180,
        "corriente_rx_mA": 80,
        "corriente_reposo_mA": 15,
        "tiempo_paquete_s": 0.02
    },

    "hibrida": {
        "nombre": "LoRa + Wi-Fi",
        "alcance_km": 5.0,
        "pdr_base": 0.95,
        "latencia_base_ms": 500,
        "latencia_salto_ms": 50,
        "saltos": 2,
        "corriente_tx_mA": 100,
        "corriente_rx_mA": 30,
        "corriente_reposo_mA": 0.02,
        "tiempo_paquete_s": 0.2
    }
}


def obtener_perfil(arquitectura):
    """
    Obtiene una copia del perfil de red.
    """

    if arquitectura not in PERFILES_RED:
        raise ValueError("Arquitectura IoT no reconocida.")

    return PERFILES_RED[arquitectura].copy()


def calcular_saltos(arquitectura, distancia_km, perfil):
    """
    Estima la cantidad de saltos de comunicacion.

    En LoRa Mesh se calcula segun el alcance por salto.
    En las otras arquitecturas se utiliza el perfil definido.
    """

    if arquitectura == "lora_mesh":
        return max(
            1,
            math.ceil(distancia_km / perfil["alcance_km"])
        )

    return perfil["saltos"]


def calcular_pdr(arquitectura, distancia_km, perfil, saltos):
    """
    Estima la probabilidad de entrega de paquetes.

    PDR = Packet Delivery Ratio.

    El resultado es un modelo simplificado de distancia.
    No representa un modelo de propagacion radioelectrica.
    """

    if distancia_km < 0:
        raise ValueError("La distancia no puede ser negativa.")

    alcance = perfil["alcance_km"]
    pdr_base = perfil["pdr_base"]

    if arquitectura == "lora_mesh":
        pdr = pdr_base ** saltos

    else:
        if distancia_km > alcance:
            pdr = pdr_base * 0.10
        else:
            relacion = distancia_km / alcance

            penalizacion = 1 - 0.25 * relacion**2

            pdr = pdr_base * penalizacion

    return min(1.0, max(0.0, pdr))


def calcular_latencia(arquitectura, perfil, saltos):
    """
    Estima la latencia de comunicacion en milisegundos.
    """

    latencia = (
        perfil["latencia_base_ms"]
        + max(0, saltos - 1) * perfil["latencia_salto_ms"]
    )

    return latencia


def calcular_consumo(
    perfil,
    intervalo_transmision_s,
    bateria_mAh,
    voltaje,
    saltos
):
    """
    Estima el consumo promedio y la autonomia.

    Es un modelo simplificado de ciclo de trabajo.
    No incluye todos los consumos del dispositivo.
    """

    if intervalo_transmision_s <= 0:
        raise ValueError("El intervalo debe ser positivo.")

    if bateria_mAh <= 0 or voltaje <= 0:
        raise ValueError("Bateria y voltaje deben ser positivos.")

    tiempo_paquete = perfil["tiempo_paquete_s"]

    if tiempo_paquete >= intervalo_transmision_s:
        raise ValueError(
            "El tiempo de paquete debe ser menor al intervalo."
        )

    ciclo_tx = tiempo_paquete / intervalo_transmision_s

    # En una red con varios saltos se considera
    # actividad adicional de recepcion.
    ciclo_rx = min(
        1 - ciclo_tx,
        max(0, saltos - 1) * ciclo_tx
    )

    ciclo_reposo = 1 - ciclo_tx - ciclo_rx

    corriente_promedio = (
        perfil["corriente_tx_mA"] * ciclo_tx
        + perfil["corriente_rx_mA"] * ciclo_rx
        + perfil["corriente_reposo_mA"] * ciclo_reposo
    )

    autonomia_horas = bateria_mAh / corriente_promedio

    energia_paquete_Wh = (
        voltaje
        * corriente_promedio
        * intervalo_transmision_s
        / 3600
    )

    return {
        "corriente_promedio_mA": corriente_promedio,
        "autonomia_horas": autonomia_horas,
        "autonomia_dias": autonomia_horas / 24,
        "energia_por_intervalo_Wh": energia_paquete_Wh
    }


def simular_comunicacion(
    arquitectura,
    distancia_km,
    cantidad_paquetes,
    intervalo_transmision_s,
    bateria_mAh,
    voltaje,
    rng
):
    """
    Simula la entrega de paquetes y calcula:

    - PDR estimado.
    - Paquetes entregados.
    - Paquetes perdidos.
    - Latencia estimada.
    - Consumo promedio.
    - Autonomia estimada.

    rng permite repetir los experimentos con semillas
    aleatorias controladas.
    """

    if cantidad_paquetes <= 0:
        raise ValueError(
            "La cantidad de paquetes debe ser positiva."
        )

    if not isinstance(rng, np.random.Generator):
        raise TypeError("rng debe ser un generador de NumPy.")

    perfil = obtener_perfil(arquitectura)

    saltos = calcular_saltos(
        arquitectura,
        distancia_km,
        perfil
    )

    pdr = calcular_pdr(
        arquitectura,
        distancia_km,
        perfil,
        saltos
    )

    latencia = calcular_latencia(
        arquitectura,
        perfil,
        saltos
    )

    consumo = calcular_consumo(
        perfil,
        intervalo_transmision_s,
        bateria_mAh,
        voltaje,
        saltos
    )

    # Simulacion aleatoria de entrega de paquetes
    entregados = rng.binomial(
        n=cantidad_paquetes,
        p=pdr
    )

    perdidos = cantidad_paquetes - entregados

    pdr_observado = entregados / cantidad_paquetes

    return {
        "arquitectura": perfil["nombre"],
        "distancia_km": distancia_km,
        "cantidad_paquetes": cantidad_paquetes,
        "paquetes_entregados": int(entregados),
        "paquetes_perdidos": int(perdidos),
        "pdr_estimado": pdr,
        "pdr_observado": pdr_observado,
        "latencia_ms": latencia,
        "saltos": saltos,
        **consumo
    }

