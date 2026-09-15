# Sistema de Gestión de Turnos para Canchas

## Descripción del proyecto

El proyecto consiste en el desarrollo de un sistema destinado a la **gestión de turnos para canchas deportivas**. Su propósito es organizar y facilitar la administración de las canchas, los horarios disponibles y las reservas realizadas por los usuarios.

El sistema busca resolver la problemática de llevar un control ordenado de los turnos, evitando la asignación de una misma cancha a más de un usuario en un mismo horario y permitiendo consultar de manera sencilla la disponibilidad existente.

Entre las principales funcionalidades previstas se encuentra la posibilidad de **registrar y administrar canchas deportivas**, gestionar los datos de los usuarios y realizar operaciones relacionadas con los turnos. El sistema deberá permitir consultar los horarios disponibles, registrar reservas y administrar o modificar la información correspondiente cuando sea necesario.

Además, se busca que el proyecto tenga una estructura organizada y escalable, de manera que cada parte del sistema tenga una responsabilidad definida. Esto permitirá facilitar el desarrollo, mantenimiento y futuras ampliaciones del proyecto.

El sistema será desarrollado progresivamente, incorporando las funcionalidades necesarias de acuerdo con los requerimientos establecidos para el proyecto.

## Objetivos

* Organizar la gestión de canchas deportivas.
* Administrar la disponibilidad de horarios.
* Registrar y gestionar los turnos realizados.
* Evitar conflictos entre reservas de una misma cancha y horario.
* Mantener la información del sistema organizada.
* Desarrollar una estructura que permita ampliar el sistema posteriormente.

## Estructura del proyecto

```text
TP0/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   └── database/
│   │
│   └── tests/
│
├── docs/
│
├── .gitignore
└── README.md
```

### Descripción de las carpetas

* **`backend/`**: contiene los componentes relacionados con la parte principal del sistema.
* **`app/`**: contiene la estructura principal de la aplicación.
* **`models/`**: destinada a los modelos que representarán las entidades del sistema.
* **`schemas/`**: destinada a las estructuras utilizadas para validar y organizar los datos.
* **`routers/`**: destinada a las rutas y operaciones disponibles del sistema.
* **`services/`**: destinada a la lógica y reglas de negocio.
* **`database/`**: destinada a los elementos relacionados con el acceso y manejo de los datos.
* **`tests/`**: contiene las pruebas realizadas sobre el sistema.
* **`docs/`**: contiene documentación adicional relacionada con el proyecto.
* **`.gitignore`**: especifica los archivos y carpetas que no deben formar parte del repositorio.
* **`README.md`**: contiene la descripción y documentación general del proyecto.

## Estado del proyecto

Proyecto en etapa inicial de desarrollo.
