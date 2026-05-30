# Sistema Portuario - Frontend

Frontend del Sistema Portuario, una aplicación demo orientada a operaciones portuarias, logística, estiba y maquinaria.

El proyecto fue desarrollado como portfolio técnico profesional, simulando una arquitectura empresarial real con autenticación JWT, roles, trazabilidad y despliegue público.

---

# Demo pública

# https://sistema-portuario.martinpintos677.workers.dev

---

# Desarrollo asistido por IA

El proyecto fue desarrollado utilizando un enfoque moderno de AI-assisted development.

La primera base visual del frontend fue generada utilizando Lovable como acelerador inicial de interfaz y estructura visual. Posteriormente, el sistema fue evolucionado, integrado y refinado manualmente mediante trabajo iterativo asistido con Codex y herramientas de IA, enfocándose en:

* integración real con backend ASP.NET Core
* arquitectura modular
* autenticación JWT
* guards por roles
* trazabilidad
* refactorización
* debugging
* mejoras UX/UI
* despliegue cloud
* CI/CD
* optimización y hardening

El objetivo no fue únicamente generar pantallas, sino construir una demo empresarial coherente, mantenible y preparada para evolucionar como un sistema real.

El proyecto refleja un enfoque moderno de desarrollo donde la IA actúa como acelerador técnico, mientras las decisiones de arquitectura, integración, validación y evolución del sistema continúan dependiendo del criterio del desarrollador.

---

# Tecnologías

## Frontend

* React
* TypeScript
* TanStack Router / TanStack Start
* Vite
* Tailwind CSS
* Radix UI
* Axios

## Infraestructura

* Cloudflare Workers
* GitHub Actions
* GitHub

---

# Funcionalidades principales

* Login con JWT.
* Roles y rutas protegidas.
* Dashboard operativo.
* Gestión de usuarios.
* Gestión de clientes.
* Gestión de maquinaria.
* Gestión de órdenes de servicio.
* Gestión de mantenimiento.
* Gestión de estiba.
* Notificaciones.
* Trazabilidad.
* Refresh token automático.
* Interceptor HTTP con Axios.
* UI responsive.
* Deploy público productivo.

---

# Arquitectura frontend

Estructura modular basada en:

```text
src/
├── api/
├── auth/
├── components/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── types/
└── utils/
```

Incluye:

* guards por rol
* manejo centralizado de autenticación
* interceptor JWT
* refresh token
* servicios desacoplados
* tipado fuerte con TypeScript

---

# Roles demo

El sistema incluye usuarios demo con distintos permisos:

* Administrador
* Encargado
* Operario
* Oficina

Las credenciales se muestran automáticamente en el login para facilitar la evaluación técnica.

---

# Backend relacionado

Este frontend consume una API ASP.NET Core desplegada en Azure App Service con Azure SQL.

Características principales del backend:

* JWT Authentication
* Refresh Tokens
* BCrypt
* Entity Framework Core
* SQL Server / Azure SQL
* Swagger/OpenAPI
* Arquitectura basada en Controllers + Services + DTOs + EF Core
* Trazabilidad y auditoría
* Paginación
* ProblemDetails y manejo global de errores

---

# Deploy

El frontend se encuentra desplegado en Cloudflare Workers mediante pipeline automático con GitHub Actions.

---

# Objetivo del proyecto

El objetivo del proyecto es demostrar:

* arquitectura frontend moderna
* integración real frontend/backend
* autenticación y seguridad
* despliegue cloud
* organización empresarial
* mantenibilidad
* escalabilidad
  
