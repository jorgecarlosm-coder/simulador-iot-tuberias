
import os
import csv

from experimentos.experimento_H1 import ejecutar_experimento_H1
from experimentos.experimento_H2 import ejecutar_experimento_H2
from experimentos.experimento_H3 import ejecutar_experimento_H3
from experimentos.experimento_H4 import ejecutar_experimento_H4


# --------------------------------------------------
# 1. CREAR CARPETA DE RESULTADOS
# --------------------------------------------------

CARPETA_RESULTADOS = "resultados"

os.makedirs(
    CARPETA_RESULTADOS,
    exist_ok=True
)


# --------------------------------------------------
# 2. GUARDAR RESULTADOS EN CSV
# --------------------------------------------------

def guardar_csv(nombre_archivo, datos):

    if not datos:
        raise ValueError(
            f"No existen datos para guardar: {nombre_archivo}"
        )

    ruta = os.path.join(
        CARPETA_RESULTADOS,
        nombre_archivo
    )

    columnas = list(datos[0].keys())

    with open(
        ruta,
        "w",
        newline="",
        encoding="utf-8"
    ) as archivo:

        escritor = csv.DictWriter(
            archivo,
            fieldnames=columnas
        )

        escritor.writeheader()
        escritor.writerows(datos)

    print(
        f"Archivo generado correctamente: {ruta}"
    )


# --------------------------------------------------
# 3. EJECUTAR Y CONSOLIDAR LOS EXPERIMENTOS
# --------------------------------------------------

def consolidar_resultados():

    print("\n======================================")
    print(" CONSOLIDACION DE RESULTADOS")
    print("======================================")

    print("\nEjecutando nuevamente H1...")
    resultados_H1 = ejecutar_experimento_H1()

    print("\nEjecutando nuevamente H2...")
    resultados_H2 = ejecutar_experimento_H2()

    print("\nEjecutando nuevamente H3...")
    resultados_H3 = ejecutar_experimento_H3()

    print("\nEjecutando nuevamente H4...")
    resultados_H4 = ejecutar_experimento_H4()

    # Guardar cada experimento por separado

    guardar_csv(
        "resultados_H1.csv",
        resultados_H1
    )

    guardar_csv(
        "resultados_H2.csv",
        resultados_H2
    )

    guardar_csv(
        "resultados_H3.csv",
        resultados_H3
    )

    guardar_csv(
        "resultados_H4.csv",
        resultados_H4
    )

    print("\n======================================")
    print(" CONSOLIDACION FINALIZADA")
    print("======================================")

    print("Se generaron cuatro archivos CSV.")


if __name__ == "__main__":
    consolidar_resultados()
