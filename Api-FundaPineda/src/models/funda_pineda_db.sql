-- FundaPineda - esquema + seed minimo (produccion)
-- =============================================================================
-- Contenido: SOLO la estructura de las 8 tablas y los datos iniciales:
--   * roles: administrador, jefe_familia (id estable), creador_contenido
--   * un usuario administrador: admin@fundapineda.org con un hash de relleno.
--     deploy/install.sh lo rota por una contrasena aleatoria al instalar
--     (import manual: resetear con /auth/forgot-password configurando el SMTP)
-- Las tablas adscripciones / ubicaciones / verification_codes / used_tokens
-- quedan vacias (solo estructura).
--
-- Compatible con MariaDB 10.4+ / 10.11 (DEFAULT uuid() es MariaDB).
-- =============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `rol` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `rol`, `descripcion`) VALUES
('a3f1c8f0-0000-4b00-8000-000000000001', 'administrador', 'Acceso total al sistema'),
('98a65fc9-a4f0-4463-97bb-10d6cf6e3996', 'jefe_familia', 'Rol asignado al registrar una adscripcion'),
('a3f1c8f0-0000-4b00-8000-000000000002', 'creador_contenido', 'Puede crear y editar noticias');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ubicaciones`
--

CREATE TABLE `ubicaciones` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `pais` varchar(100) NOT NULL,
  `estado` varchar(100) NOT NULL,
  `ciudad` varchar(100) NOT NULL,
  `direccion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personas`
--

CREATE TABLE `personas` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `cedula` varchar(75) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` char(1) DEFAULT NULL CHECK (`genero` in ('M','F')),
  `nacionalidad` varchar(50) DEFAULT 'Venezolana',
  `telefono` varchar(20) NOT NULL,
  `nombre_familia` varchar(100) NOT NULL,
  `ubicacion_id` char(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `personas`
--

INSERT INTO `personas` (`id`, `cedula`, `nombre`, `apellido`, `fecha_nacimiento`, `genero`, `nacionalidad`, `telefono`, `nombre_familia`, `ubicacion_id`) VALUES
('a3f1c8f0-0000-4b00-8000-0000000000a1', 'ADMIN00000000', 'Administrador', 'Sistema', '2000-01-01', NULL, 'Venezolana', '0000000000', 'FundaPineda', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `persona_id` char(36) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `verificado` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--
-- Usuario administrador. El hash de abajo es de relleno (contrasena
-- r1D8nIS8RDdynM); deploy/install.sh lo rota por una aleatoria al instalar.
-- En import manual, resetear con /auth/forgot-password tras configurar el SMTP.
--

INSERT INTO `usuarios` (`id`, `persona_id`, `email`, `password_hash`, `activo`, `verificado`, `created_at`) VALUES
('a3f1c8f0-0000-4b00-8000-0000000000b1', 'a3f1c8f0-0000-4b00-8000-0000000000a1', 'admin@fundapineda.org', '$2b$12$pHZFgSAWuRYgKHmXVX0u6OTGYo0K6Gdz.iNLCTBIP.rcWUfCnNQnO', 1, 1, NOW());

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_roles`
--

CREATE TABLE `usuario_roles` (
  `usuario_id` char(36) NOT NULL,
  `rol_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario_roles`
--

INSERT INTO `usuario_roles` (`usuario_id`, `rol_id`) VALUES
('a3f1c8f0-0000-4b00-8000-0000000000b1', 'a3f1c8f0-0000-4b00-8000-000000000001');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adscripciones`
--

CREATE TABLE `adscripciones` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `jefe_familia_id` char(36) NOT NULL,
  `fecha_firma` date NOT NULL,
  `ruta_firma` varchar(255) NOT NULL,
  `ruta_documento_final` varchar(255) NOT NULL,
  `ip_registro` varchar(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `verification_codes`
--

CREATE TABLE `verification_codes` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `code` varchar(6) NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `max_attempts` int(11) NOT NULL DEFAULT 3,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `used_tokens`
--

CREATE TABLE `used_tokens` (
  `id` varchar(64) NOT NULL,
  `user_id` char(36) NOT NULL,
  `proposito` varchar(50) NOT NULL,
  `usado_en` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Indices para tablas volcadas
--

ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rol` (`rol`);

ALTER TABLE `ubicaciones`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `personas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD KEY `fk_ubicacion` (`ubicacion_id`);

ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `persona_id` (`persona_id`),
  ADD UNIQUE KEY `email` (`email`);

ALTER TABLE `usuario_roles`
  ADD PRIMARY KEY (`usuario_id`,`rol_id`),
  ADD KEY `fk_rol_uuid` (`rol_id`);

ALTER TABLE `adscripciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jefe_familia_uuid` (`jefe_familia_id`);

ALTER TABLE `verification_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

ALTER TABLE `used_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_used_token_user` (`user_id`);

-- --------------------------------------------------------

--
-- Restricciones para tablas volcadas
--

ALTER TABLE `personas`
  ADD CONSTRAINT `fk_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`) ON DELETE SET NULL;

ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE CASCADE;

ALTER TABLE `usuario_roles`
  ADD CONSTRAINT `fk_rol_uuid` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_usuario_uuid` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

ALTER TABLE `adscripciones`
  ADD CONSTRAINT `fk_jefe_familia_uuid` FOREIGN KEY (`jefe_familia_id`) REFERENCES `personas` (`id`);

ALTER TABLE `verification_codes`
  ADD CONSTRAINT `fk_verification_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

ALTER TABLE `used_tokens`
  ADD CONSTRAINT `fk_used_token_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;