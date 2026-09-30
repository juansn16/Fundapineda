# SPEC.md - Fundación Pineda Frontend

## 1. Project Overview

**Project Name:** Fundación Pineda - Frontend Web
**Project Type:** Single Page Application (SPA)
**Core Functionality:** Website para la Fundación Pineda con información institucional, servicios de salud, directorio médico y proceso de adscripción al programa P.A.A.I.S.
**Target Users:** Familias de Maracaibo interessadas en el programa de salud, profesionales de la salud, y público general.

---

## 2. Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS (customizada)
- **Animations:** Framer Motion
- **Routing:** React Router DOM v6
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

---

## 3. Design System

### 3.1 Colores Corporativos

| Color Name | Hex Code | Usage |
|-----------|----------|-------|
| Azul Real | `#1D5BA3` | Primary, headers, CTAs |
| Rojo Sangre | `#C8161D` | Accent, alerts, emphasis |
| Gris Carbón | `#575756` | Text, borders, secondary |

### 3.2 Tipografía

- **Font Family:** "Franklin Gothic Heavy", "Arial Black", sans-serif (headings)
- **Body Font:** system-ui, sans-serif
- **Sizes:**
  - H1: 3rem (48px)
  - H2: 2.25rem (36px)
  - H3: 1.5rem (24px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

### 3.3 Especificaciones de Layout

- **Max Container Width:** 1280px
- **Responsive Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

---

## 4. Site Structure

### 4.1 Rutas

| Path | Componente | Descripción |
|------|-------------|-------------|
| `/` | HomePage | Landing del libro de procedimientos médicos |
| `/sobre-nosotros` | AboutPage | Historia, misión, visión |
| `/servicios` | ServicesPage | Grid de servicios |
| `/directorio-medico` | DoctorsPage | Directorio médico |
| `/contactanos` | ContactPage | Formulario de contacto |
| `/adscripcion` | AdscripcionWizard | Wizard 3 pasos |

### 4.2 Navegación

- **Header:** Logo (izquierda), Nav links (centro/derecha), botón CTA
- **Mobile:** Hamburger menu con drawer
- **Footer:** Links útiles, redes sociales, copyright

---

## 5. Page Specifications

### 5.1 Home Page (`/`)

**Hero Section:**
- Background con imagen del libro (portada-libro.jpeg)
- Titulo: "Libro de Procedimientos Médicos"
- Subtítulo: "Guía integral para la salud de tu familia"
- Botón CTA: "Solicitar Información"

**Features Section:**
- 3 cards highlighting beneficios del libro
- Iconos + titulo + descripción

**CTA Section:**
- Sección final con botón de inscripción

### 5.2 Sobre Nosotros Page (`/sobre-nosotros`)

- Historia de la fundación
- Misión
- Visión
- Valores

### 5.3 Servicios Page (`/servicios`)

- Grid de 6 servicios
- Card con icono, titulo, descripción

### 5.4 Directorio Médico (`/directorio-medico`)

- Buscador por nombre/especialidad
- Grid de doctores (datos quemados)
- Card: foto, nombre, especialidad, teléfono

### 5.5 Contactanos (`/contactanos`)

- Formulario: nombre, email, teléfono, mensaje
- Información de contacto (presión, email, dirección)

### 5.6 Adscripción (`/adscripcion`) - WIZARD

**Paso 1 - Datos Personales:**
- Nombre* (text)
- Apellido* (text)
- Cédula* (text)
- Fecha de nacimiento* (date)
- Género* (select: Masculino/Femenino)
- Teléfono* (tel)

**Paso 2 - Documento Legal:**
- Nacionalidad* (select)
- Nombre de familia* (text)
- Firma*: Upload de imagen o tomar webcam
- Vista previa del documento con datos

**Paso 3 - Confirmación:**
- Email* (email)
- Contraseña* (password)
- Checkbox: "Confirmo que todos los datos son correctos"*
- Botón:Finalizar inscripción

---

## 6. Animaciones

### 6.1 Transiciones de Página

- Fade in con slide-up al cargar (300ms ease-out)

### 6.2 Scroll Animations

- Elementos aparecen al hacer scroll (fade-in-up)

### 6.3 Hover Effects

- Buttons: scale(1.02), shadow increase
- Cards: translateY(-4px), shadow
- Links: color transition

### 6.4 Wizard Transitions

- Slide left/right entre pasos
- Progress indicator animado

---

## 7. Components List

### 7.1 Base Components

- `Button` - Primary, Secondary, Outline variants
- `Input` - Text, Email, Password, Date, Tel
- `Select` - Dropdown
- `Card` - Container con estilos
- `Container` - Max width wrapper
- `SectionTitle` - Títulos de sección

### 7.2 Layout Components

- `Header` - Navegación principal
- `Footer` - Pie de página
- `Layout` - Wrapper general
- `MobileNav` - Menú móvil

### 7.3 Feature Components

- `ServiceCard` - Card de servicio
- `DoctorCard` - Card de doctor
- `StepIndicator` - Indicador de paso wizard
- `FirmaCapture` - Componente de captura de firma
- `DocumentPreview` - Vista previa del documento legal

---

## 8. Validación de Formularios

### 8.1 Contact Form

- Nombre: required, min 2 chars
- Email: required, valid email
- Teléfono: optional
- Mensaje: required, min 10 chars

### 8.2 Adscripción Wizard

**Paso 1:**
- Todos los campos requeridos
- Cédula: formato válido
- Teléfono: formato válido

**Paso 2:**
- Nacionalidad: requerida
- Nombre familia: requerido, min 2 chars
- Firma: requerida (imagen)

**Paso 3:**
- Email: requerido, válido
- Contraseña: requerida, min 6 chars
- Checkbox: requerido

---

## 9. Assets

### 9.1 Imágenes

- `logo.jpeg` - Logo de la fundación
- `portada-libro.jpeg` - Portada del libro

### 9.2 Iconos (Lucide)

- Home, FileText, Users, Stethoscope, Mail, UserPlus
- ArrowRight, Check, AlertCircle, Phone, MapPin

---

## 10. Success Criteria

- [x] Todas las páginas accesibles via router
- [x] Diseño responsive (mobile, tablet, desktop)
- [x] Colores corporativos aplicados
- [x] Animaciones suaves sin lag
- [x] Formularios con validación
- [x] Wizard de adscripción funcional
- [x] Captura de firma (upload + webcam)
- [x] Documento legal con datos dinámicos