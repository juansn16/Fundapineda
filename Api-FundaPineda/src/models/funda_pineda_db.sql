-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 03-05-2026 a las 05:27:07
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `funda_pineda_db`
--

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

--
-- Volcado de datos para la tabla `adscripciones`
--

INSERT INTO `adscripciones` (`id`, `jefe_familia_id`, `fecha_firma`, `ruta_firma`, `ruta_documento_final`, `ip_registro`) VALUES
('17ed50d5-32f0-4173-bf26-9fddad264cef', 'c4b1fc8e-23e5-4f3a-918f-d067708aeb3c', '2026-04-29', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\signatures\\firma_7822351_7e9ed1.png', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\document\\adscripcion_7822351.pdf', '127.0.0.1'),
('30c41e98-2bfd-4d3f-a113-ba931d47a028', 'b73dcd42-decf-47b1-8f09-63d4a5047df4', '2026-04-25', 'X:\\Proyectos\\Funda Pineda\\src\\static\\signatures\\firma_31002000_e27325.png', 'X:\\Proyectos\\Funda Pineda\\src\\static\\document\\adscripcion_31002000.pdf', '192.168.1.1'),
('5155765f-cf90-4fff-9051-2dd050ab1cfe', '33a695a0-672d-457a-86c8-9bdd6f4f1a90', '2026-04-25', 'X:\\Proyectos\\Funda Pineda\\src\\static\\signatures\\firma_31000000_b28e17.png', 'X:\\Proyectos\\Funda Pineda\\src\\static\\document\\adscripcion_31000000.pdf', '192.168.1.1'),
('5d9a2f79-afe4-4f8a-901c-757c2b4781c5', '95a05ef0-24a2-4447-be5d-65cae4e7c6c4', '2026-02-25', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\signatures\\firma_31000040_a1a328.png', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\document\\adscripcion_31000040.pdf', '192.168.1.1'),
('65729e5f-fab2-47fe-a6b5-bcc8002320dd', '43bc8e6d-96dc-4abb-bacd-2d94503c769f', '2026-02-25', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\signatures\\firma_311111111_55c443.png', 'X:\\Proyectos\\Api-FundaPineda\\src\\static\\document\\adscripcion_311111111.pdf', '192.168.1.1'),
('e5d2896c-9122-4498-9788-ef7eaa16a9ae', '0e7ac316-ca43-47ed-9ebc-9b5a3a2c3023', '2026-04-25', 'X:\\Proyectos\\Funda Pineda\\src\\static\\signatures\\firma_310402000_a7a214.png', 'X:\\Proyectos\\Funda Pineda\\src\\static\\document\\adscripcion_310402000.pdf', '192.168.1.1');

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
('0e7ac316-ca43-47ed-9ebc-9b5a3a2c3023', '310402000', 'Juan Antonio', 'Salazar Nuvaez', '2004-12-04', 'M', 'Venezolano', '0412-1224567', 'Familia Salazar Nuvaez', NULL),
('33a695a0-672d-457a-86c8-9bdd6f4f1a90', '31000000', 'Juan Antonio', 'Salazar Nuvaez', '2004-12-04', 'M', 'Venezolano', '0412-1234567', 'Familia Salazar Nuvaez', NULL),
('43bc8e6d-96dc-4abb-bacd-2d94503c769f', '311111111', 'Juan Antonio', 'Salazar Nuvaez', '2004-12-04', 'M', 'Venezolano', '0412-1234567', 'Familia Salazar Nuvaez', NULL),
('95a05ef0-24a2-4447-be5d-65cae4e7c6c4', '31000040', 'Juan Antonio', 'Salazar Nuvaez', '2004-12-04', 'M', 'Venezolano', '0412-1234567', 'Familia Salazar Nuvaez', NULL),
('b73dcd42-decf-47b1-8f09-63d4a5047df4', '31002000', 'Juan Antonio', 'Salazar Nuvaez', '2004-12-04', 'M', 'Venezolano', '0412-1224567', 'Familia Salazar Nuvaez', NULL),
('c4b1fc8e-23e5-4f3a-918f-d067708aeb3c', '7822351', 'Juan Antonio', 'Salazar Nuvaez', '2026-04-29', 'M', 'Venezolana', '4246953455', 'sadfsda', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `rol` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `rol`) VALUES
('98a65fc9-a4f0-4463-97bb-10d6cf6e3996', 'jefe_familia');

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
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `persona_id` char(36) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `persona_id`, `email`, `password_hash`, `activo`, `created_at`) VALUES
('098625f9-5b75-4ae2-ba8c-141e64f2b7fc', '43bc8e6d-96dc-4abb-bacd-2d94503c769f', 'landingyoyo@gmail.com', '$2b$12$uSORBcvlMORPZYJ2u4LynOSs4UiQYRGxID2zeMkrERhfDew6vHqw.', 1),
('2beb74ea-d1e1-42de-828d-e0724fc73337', '0e7ac316-ca43-47ed-9ebc-9b5a3a2c3023', 'usuario1454123@example.com', '$2b$12$cER0dcWIhzdYRh.n.i318upTkYHx2MZiB8nNcDncM252EbIPYfvIy', 1),
('7d9c1e14-4e49-47f7-b385-e268f5296dbd', '33a695a0-672d-457a-86c8-9bdd6f4f1a90', 'usuario123@example.com', '$2b$12$0e4NPeovYixsm8WddP8tauOslPz3tm9Nn9ai31w.jZEEqwZKlipJW', 1),
('c2d50573-4f6c-449f-b94b-01919e9a7cb7', 'c4b1fc8e-23e5-4f3a-918f-d067708aeb3c', 'montoyugi@gmail.com', '$2b$12$v8Z0YgGb7xuuxTmgFzXbvuTb4ZekNvCxLXot2GqGkw3Xj8E4q4g5.', 1),
('d1f8aa58-390e-4ea6-a06f-223f15892462', '95a05ef0-24a2-4447-be5d-65cae4e7c6c4', 'b@example.com', '$2b$12$z8C..SYX9HAkewd9nbLVI.DNDBD8tN9lAiZyPTqs/wAqgrCizzYGy', 1),
('d9135b7e-cf36-494b-b1f1-25ee64fa9db9', 'b73dcd42-decf-47b1-8f09-63d4a5047df4', 'usuario1123@example.com', '$2b$12$g4JKVgCCG5lhG3we9W6.7OrnrEvKZFBaUC7rFBxBMt3zEr1bKHM.O', 1);

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
('098625f9-5b75-4ae2-ba8c-141e64f2b7fc', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996'),
('2beb74ea-d1e1-42de-828d-e0724fc73337', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996'),
('7d9c1e14-4e49-47f7-b385-e268f5296dbd', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996'),
('c2d50573-4f6c-449f-b94b-01919e9a7cb7', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996'),
('d1f8aa58-390e-4ea6-a06f-223f15892462', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996'),
('d9135b7e-cf36-494b-b1f1-25ee64fa9db9', '98a65fc9-a4f0-4463-97bb-10d6cf6e3996');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `adscripciones`
--
ALTER TABLE `adscripciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jefe_familia_uuid` (`jefe_familia_id`);

--
-- Indices de la tabla `personas`
--
ALTER TABLE `personas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD KEY `fk_ubicacion` (`ubicacion_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rol` (`rol`);

--
-- Indices de la tabla `ubicaciones`
--
ALTER TABLE `ubicaciones`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `persona_id` (`persona_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `usuario_roles`
--
ALTER TABLE `usuario_roles`
  ADD PRIMARY KEY (`usuario_id`,`rol_id`),
  ADD KEY `fk_rol_uuid` (`rol_id`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `adscripciones`
--
ALTER TABLE `adscripciones`
  ADD CONSTRAINT `fk_jefe_familia_uuid` FOREIGN KEY (`jefe_familia_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `personas`
--
ALTER TABLE `personas`
  ADD CONSTRAINT `fk_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario_roles`
--
ALTER TABLE `usuario_roles`
  ADD CONSTRAINT `fk_rol_uuid` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_usuario_uuid` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
