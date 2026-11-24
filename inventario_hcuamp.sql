-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 17-11-2026 a las 11:02:05
-- Versión del servidor: 8.4.7
-- Versión de PHP: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `inventario_hcuamp`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_producto`
--

DROP TABLE IF EXISTS `categorias_producto`;
CREATE TABLE IF NOT EXISTS `categorias_producto` (
  `id_categoria` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cierres_existencias`
--

DROP TABLE IF EXISTS `cierres_existencias`;
CREATE TABLE IF NOT EXISTS `cierres_existencias` (
  `id_cierre_existencia` bigint NOT NULL AUTO_INCREMENT,
  `id_cierre` bigint NOT NULL,
  `id_lote` bigint NOT NULL,
  `cantidad_final` decimal(14,3) NOT NULL DEFAULT '0.000',
  PRIMARY KEY (`id_cierre_existencia`),
  UNIQUE KEY `uq_cierre_lote` (`id_cierre`,`id_lote`),
  KEY `idx_cierre_existencia_lote` (`id_lote`)
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cierres_inventario`
--

DROP TABLE IF EXISTS `cierres_inventario`;
CREATE TABLE IF NOT EXISTS `cierres_inventario` (
  `id_cierre` bigint NOT NULL AUTO_INCREMENT,
  `id_periodo` bigint NOT NULL,
  `id_ubicacion` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_cierre` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_cierre`),
  UNIQUE KEY `uq_cierre_periodo_ubicacion` (`id_periodo`,`id_ubicacion`),
  KEY `fk_cierre_ubicacion` (`id_ubicacion`),
  KEY `fk_cierre_usuario` (`id_usuario`),
  KEY `idx_cierre_fecha` (`fecha_cierre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
CREATE TABLE IF NOT EXISTS `departamentos` (
  `id_departamento` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documentos`
--

DROP TABLE IF EXISTS `documentos`;
CREATE TABLE IF NOT EXISTS `documentos` (
  `id_documento` bigint NOT NULL AUTO_INCREMENT,
  `id_tipo_documento` bigint NOT NULL,
  `numero_documento` varchar(100) DEFAULT NULL,
  `codigo_requisicion` varchar(100) DEFAULT NULL,
  `numero_factura` varchar(100) DEFAULT NULL,
  `fecha_documento` date DEFAULT NULL,
  `observaciones` text,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_documento`),
  KEY `fk_documentos_tipo` (`id_tipo_documento`),
  KEY `idx_documentos_numero` (`numero_documento`),
  KEY `idx_documentos_requisicion` (`codigo_requisicion`),
  KEY `idx_documentos_factura` (`numero_factura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos_bitacora`
--

DROP TABLE IF EXISTS `eventos_bitacora`;
CREATE TABLE IF NOT EXISTS `eventos_bitacora` (
  `id_evento` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint DEFAULT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_registro_afectado` bigint DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `resultado` enum('EXITOSO','FALLIDO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EXITOSO',
  `direccion_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_evento` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evento`),
  KEY `idx_bitacora_usuario` (`id_usuario`),
  KEY `idx_bitacora_accion` (`accion`),
  KEY `idx_bitacora_entidad` (`entidad`),
  KEY `idx_bitacora_fecha` (`fecha_evento`),
  KEY `idx_bitacora_resultado` (`resultado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `existencias`
--

DROP TABLE IF EXISTS `existencias`;
CREATE TABLE IF NOT EXISTS `existencias` (
  `id_existencia` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` bigint NOT NULL,
  `id_ubicacion` bigint NOT NULL,
  `cantidad_disponible` decimal(14,3) NOT NULL DEFAULT '0.000',
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_existencia`),
  UNIQUE KEY `uk_existencia_lote_ubicacion` (`id_lote`,`id_ubicacion`),
  KEY `fk_existencias_ubicacion` (`id_ubicacion`)
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lotes`
--

DROP TABLE IF EXISTS `lotes`;
CREATE TABLE IF NOT EXISTS `lotes` (
  `id_lote` bigint NOT NULL AUTO_INCREMENT,
  `id_producto` bigint NOT NULL,
  `numero_lote` varchar(100) NOT NULL,
  `codigo_barras` varchar(100) NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_lote`),
  UNIQUE KEY `codigo_barras` (`codigo_barras`),
  UNIQUE KEY `uk_producto_numero_lote` (`id_producto`,`numero_lote`),
  KEY `idx_lotes_vencimiento` (`fecha_vencimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modulos`
--

DROP TABLE IF EXISTS `modulos`;
CREATE TABLE IF NOT EXISTS `modulos` (
  `id_modulo` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_modulo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `modulos`
--

INSERT INTO `modulos` (`id_modulo`, `nombre`, `descripcion`, `activo`, `fecha_creacion`) VALUES
(1, 'Farmacia', 'Módulo de inventario de Farmacia, que contiene las ubicaciones Mayor y Detal.', 1, '2026-11-15 18:58:53'),
(2, 'Almacén', 'Módulo de inventario de Almacén.', 1, '2026-11-15 18:58:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
CREATE TABLE IF NOT EXISTS `movimientos` (
  `id_movimiento` bigint NOT NULL AUTO_INCREMENT,
  `id_modulo` bigint NOT NULL,
  `id_tipo_movimiento` bigint NOT NULL,
  `id_ubicacion_origen` bigint DEFAULT NULL,
  `id_ubicacion_destino` bigint DEFAULT NULL,
  `id_servicio_destino` bigint DEFAULT NULL,
  `id_documento` bigint DEFAULT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_efectiva` date NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text,
  PRIMARY KEY (`id_movimiento`),
  UNIQUE KEY `uk_movimiento_documento` (`id_documento`),
  KEY `fk_movimientos_tipo` (`id_tipo_movimiento`),
  KEY `fk_movimientos_origen` (`id_ubicacion_origen`),
  KEY `fk_movimientos_destino` (`id_ubicacion_destino`),
  KEY `fk_movimientos_servicio` (`id_servicio_destino`),
  KEY `fk_movimientos_usuario` (`id_usuario`),
  KEY `idx_movimientos_fecha` (`fecha_efectiva`),
  KEY `idx_movimientos_modulo` (`id_modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_correcciones`
--

DROP TABLE IF EXISTS `movimientos_correcciones`;
CREATE TABLE IF NOT EXISTS `movimientos_correcciones` (
  `id_correccion` bigint NOT NULL AUTO_INCREMENT,
  `id_movimiento_original` bigint NOT NULL,
  `id_movimiento_correctivo` bigint NOT NULL,
  `id_usuario_autorizador` bigint NOT NULL,
  `motivo` text NOT NULL,
  `fecha_correccion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_correccion`),
  UNIQUE KEY `uk_correccion_original` (`id_movimiento_original`),
  UNIQUE KEY `uk_correccion_correctivo` (`id_movimiento_correctivo`),
  KEY `fk_correccion_autorizador` (`id_usuario_autorizador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_detalle`
--

DROP TABLE IF EXISTS `movimientos_detalle`;
CREATE TABLE IF NOT EXISTS `movimientos_detalle` (
  `id_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_movimiento` bigint NOT NULL,
  `id_lote` bigint NOT NULL,
  `id_detalle_recepcion` bigint DEFAULT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  UNIQUE KEY `uk_movimiento_detalle_recepcion` (`id_detalle_recepcion`),
  KEY `idx_mov_detalle_movimiento` (`id_movimiento`),
  KEY `idx_mov_detalle_lote` (`id_lote`)
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `periodos_inventario`
--

DROP TABLE IF EXISTS `periodos_inventario`;
CREATE TABLE IF NOT EXISTS `periodos_inventario` (
  `id_periodo` bigint NOT NULL AUTO_INCREMENT,
  `anio` smallint NOT NULL,
  `mes` tinyint NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_periodo`),
  UNIQUE KEY `uq_periodo_anio_mes` (`anio`,`mes`)
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos`
--

DROP TABLE IF EXISTS `permisos`;
CREATE TABLE IF NOT EXISTS `permisos` (
  `id_permiso` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `procedencias`
--

DROP TABLE IF EXISTS `procedencias`;
CREATE TABLE IF NOT EXISTS `procedencias` (
  `id_procedencia` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_procedencia`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE IF NOT EXISTS `productos` (
  `id_producto` bigint NOT NULL AUTO_INCREMENT,
  `id_categoria` bigint DEFAULT NULL,
  `id_unidad` bigint NOT NULL,
  `codigo` varchar(80) DEFAULT NULL,
  `nombre` varchar(180) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_productos_categoria` (`id_categoria`),
  KEY `fk_productos_unidad` (`id_unidad`),
  KEY `idx_productos_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recepciones`
--

DROP TABLE IF EXISTS `recepciones`;
CREATE TABLE IF NOT EXISTS `recepciones` (
  `id_recepcion` bigint NOT NULL AUTO_INCREMENT,
  `id_procedencia` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_llegada` date NOT NULL,
  `observaciones` text,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_recepcion`),
  KEY `fk_recepciones_procedencia` (`id_procedencia`),
  KEY `fk_recepciones_usuario` (`id_usuario`),
  KEY `idx_recepciones_fecha` (`fecha_llegada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recepciones_detalle`
--

DROP TABLE IF EXISTS `recepciones_detalle`;
CREATE TABLE IF NOT EXISTS `recepciones_detalle` (
  `id_detalle_recepcion` bigint NOT NULL AUTO_INCREMENT,
  `id_recepcion` bigint NOT NULL,
  `id_lote` bigint NOT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  PRIMARY KEY (`id_detalle_recepcion`),
  KEY `idx_detalle_recepcion` (`id_recepcion`),
  KEY `idx_detalle_lote` (`id_lote`)
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `activo`, `fecha_creacion`) VALUES
(1, 'SuperAdmin', 'Administrador general del sistema. Puede acceder a Farmacia y Almacén.', 1, '2026-11-15 18:58:53'),
(2, 'Jefe de Farmacia', 'Responsable de supervisar y administrar el módulo de Farmacia.', 1, '2026-11-15 18:58:53'),
(3, 'Jefe de Almacén', 'Responsable de supervisar y administrar el módulo de Almacén.', 1, '2026-11-15 18:58:53'),
(4, 'Trabajador de Farmacia', 'Usuario operativo con acceso al módulo de Farmacia.', 1, '2026-11-15 18:58:53'),
(5, 'Trabajador de Almacén', 'Usuario operativo con acceso al módulo de Almacén.', 1, '2026-11-15 18:58:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_modulo`
--

DROP TABLE IF EXISTS `rol_modulo`;
CREATE TABLE IF NOT EXISTS `rol_modulo` (
  `id_rol_modulo` bigint NOT NULL AUTO_INCREMENT,
  `id_rol` bigint NOT NULL,
  `id_modulo` bigint NOT NULL,
  PRIMARY KEY (`id_rol_modulo`),
  UNIQUE KEY `uk_rol_modulo` (`id_rol`,`id_modulo`),
  KEY `fk_rol_modulo_modulo` (`id_modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_permiso`
--

DROP TABLE IF EXISTS `rol_permiso`;
CREATE TABLE IF NOT EXISTS `rol_permiso` (
  `id_rol_permiso` bigint NOT NULL AUTO_INCREMENT,
  `id_rol` bigint NOT NULL,
  `id_permiso` bigint NOT NULL,
  PRIMARY KEY (`id_rol_permiso`),
  UNIQUE KEY `uk_rol_permiso` (`id_rol`,`id_permiso`),
  KEY `fk_rol_permiso_permiso` (`id_permiso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios_hospitalarios`
--

DROP TABLE IF EXISTS `servicios_hospitalarios`;
CREATE TABLE IF NOT EXISTS `servicios_hospitalarios` (
  `id_servicio` bigint NOT NULL AUTO_INCREMENT,
  `id_departamento` bigint DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_servicio`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_servicios_departamentos` (`id_departamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_documento`
--

DROP TABLE IF EXISTS `tipos_documento`;
CREATE TABLE IF NOT EXISTS `tipos_documento` (
  `id_tipo_documento` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_tipo_documento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_movimiento`
--

DROP TABLE IF EXISTS `tipos_movimiento`;
CREATE TABLE IF NOT EXISTS `tipos_movimiento` (
  `id_tipo_movimiento` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_tipo_movimiento`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transferencias`
--

DROP TABLE IF EXISTS `transferencias`;
CREATE TABLE IF NOT EXISTS `transferencias` (
  `id_transferencia` bigint NOT NULL AUTO_INCREMENT,
  `id_movimiento` bigint NOT NULL,
  `numero_transferencia` varchar(100) NOT NULL,
  `observaciones` text,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transferencia`),
  UNIQUE KEY `numero_transferencia` (`numero_transferencia`),
  UNIQUE KEY `uk_transferencia_movimiento` (`id_movimiento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ubicaciones`
--

DROP TABLE IF EXISTS `ubicaciones`;
CREATE TABLE IF NOT EXISTS `ubicaciones` (
  `id_ubicacion` bigint NOT NULL AUTO_INCREMENT,
  `id_departamento` bigint NOT NULL,
  `id_modulo` bigint NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ubicacion`),
  UNIQUE KEY `uk_ubicacion_departamento_modulo` (`id_departamento`,`id_modulo`,`nombre`),
  KEY `fk_ubicaciones_modulos` (`id_modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `unidades_medida`
--

DROP TABLE IF EXISTS `unidades_medida`;
CREATE TABLE IF NOT EXISTS `unidades_medida` (
  `id_unidad` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `abreviatura` varchar(30) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_unidad`),
  UNIQUE KEY `abreviatura` (`abreviatura`),
  UNIQUE KEY `uk_unidad_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` bigint NOT NULL AUTO_INCREMENT,
  `id_departamento` bigint DEFAULT NULL,
  `id_rol` bigint NOT NULL,
  `nombres` varchar(120) NOT NULL,
  `apellidos` varchar(120) NOT NULL,
  `nombre_usuario` varchar(80) NOT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `correo` (`correo`),
  KEY `fk_usuarios_departamento` (`id_departamento`),
  KEY `fk_usuarios_rol` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_distribucion_servicios`
-- (Véase abajo para la vista actual)
--
DROP VIEW IF EXISTS `vista_distribucion_servicios`;
CREATE TABLE IF NOT EXISTS `vista_distribucion_servicios` (
`cantidad` decimal(14,3)
,`codigo_barras` varchar(100)
,`codigo_producto` varchar(80)
,`codigo_requisicion` varchar(100)
,`fecha_efectiva` date
,`fecha_registro` timestamp
,`fecha_vencimiento` date
,`id_lote` bigint
,`id_movimiento` bigint
,`id_producto` bigint
,`id_servicio` bigint
,`id_usuario` bigint
,`nombre_insumo` varchar(180)
,`nombre_usuario` varchar(80)
,`numero_documento` varchar(100)
,`numero_factura` varchar(100)
,`numero_lote` varchar(100)
,`servicio_destino` varchar(150)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_distribucion_servicios`
--
DROP TABLE IF EXISTS `vista_distribucion_servicios`;

DROP VIEW IF EXISTS `vista_distribucion_servicios`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_distribucion_servicios`  AS SELECT `m`.`id_movimiento` AS `id_movimiento`, `m`.`fecha_efectiva` AS `fecha_efectiva`, `m`.`fecha_registro` AS `fecha_registro`, `s`.`id_servicio` AS `id_servicio`, `s`.`nombre` AS `servicio_destino`, `p`.`id_producto` AS `id_producto`, `p`.`codigo` AS `codigo_producto`, `p`.`nombre` AS `nombre_insumo`, `l`.`id_lote` AS `id_lote`, `l`.`numero_lote` AS `numero_lote`, `l`.`codigo_barras` AS `codigo_barras`, `l`.`fecha_vencimiento` AS `fecha_vencimiento`, `md`.`cantidad` AS `cantidad`, `u`.`id_usuario` AS `id_usuario`, `u`.`nombre_usuario` AS `nombre_usuario`, `d`.`numero_documento` AS `numero_documento`, `d`.`codigo_requisicion` AS `codigo_requisicion`, `d`.`numero_factura` AS `numero_factura` FROM ((((((`movimientos` `m` join `movimientos_detalle` `md` on((`m`.`id_movimiento` = `md`.`id_movimiento`))) join `servicios_hospitalarios` `s` on((`m`.`id_servicio_destino` = `s`.`id_servicio`))) join `lotes` `l` on((`md`.`id_lote` = `l`.`id_lote`))) join `productos` `p` on((`l`.`id_producto` = `p`.`id_producto`))) join `usuarios` `u` on((`m`.`id_usuario` = `u`.`id_usuario`))) left join `documentos` `d` on((`m`.`id_documento` = `d`.`id_documento`))) WHERE (`m`.`id_servicio_destino` is not null) ;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cierres_existencias`
--
ALTER TABLE `cierres_existencias`
  ADD CONSTRAINT `fk_cierre_existencia_cierre` FOREIGN KEY (`id_cierre`) REFERENCES `cierres_inventario` (`id_cierre`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cierre_existencia_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `cierres_inventario`
--
ALTER TABLE `cierres_inventario`
  ADD CONSTRAINT `fk_cierre_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `periodos_inventario` (`id_periodo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cierre_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicaciones` (`id_ubicacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cierre_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `documentos`
--
ALTER TABLE `documentos`
  ADD CONSTRAINT `fk_documentos_tipo` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento` (`id_tipo_documento`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `eventos_bitacora`
--
ALTER TABLE `eventos_bitacora`
  ADD CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `existencias`
--
ALTER TABLE `existencias`
  ADD CONSTRAINT `fk_existencias_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_existencias_ubicacion` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicaciones` (`id_ubicacion`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD CONSTRAINT `fk_lotes_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `fk_movimientos_destino` FOREIGN KEY (`id_ubicacion_destino`) REFERENCES `ubicaciones` (`id_ubicacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_documento` FOREIGN KEY (`id_documento`) REFERENCES `documentos` (`id_documento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_origen` FOREIGN KEY (`id_ubicacion_origen`) REFERENCES `ubicaciones` (`id_ubicacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_servicio` FOREIGN KEY (`id_servicio_destino`) REFERENCES `servicios_hospitalarios` (`id_servicio`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_tipo` FOREIGN KEY (`id_tipo_movimiento`) REFERENCES `tipos_movimiento` (`id_tipo_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `movimientos_correcciones`
--
ALTER TABLE `movimientos_correcciones`
  ADD CONSTRAINT `fk_correccion_autorizador` FOREIGN KEY (`id_usuario_autorizador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_correccion_correctivo` FOREIGN KEY (`id_movimiento_correctivo`) REFERENCES `movimientos` (`id_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_correccion_original` FOREIGN KEY (`id_movimiento_original`) REFERENCES `movimientos` (`id_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `movimientos_detalle`
--
ALTER TABLE `movimientos_detalle`
  ADD CONSTRAINT `fk_mov_detalle_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mov_detalle_movimiento` FOREIGN KEY (`id_movimiento`) REFERENCES `movimientos` (`id_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mov_detalle_recepcion` FOREIGN KEY (`id_detalle_recepcion`) REFERENCES `recepciones_detalle` (`id_detalle_recepcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_producto` (`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_productos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades_medida` (`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `recepciones`
--
ALTER TABLE `recepciones`
  ADD CONSTRAINT `fk_recepciones_procedencia` FOREIGN KEY (`id_procedencia`) REFERENCES `procedencias` (`id_procedencia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recepciones_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `recepciones_detalle`
--
ALTER TABLE `recepciones_detalle`
  ADD CONSTRAINT `fk_detalle_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_detalle_recepcion` FOREIGN KEY (`id_recepcion`) REFERENCES `recepciones` (`id_recepcion`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `rol_modulo`
--
ALTER TABLE `rol_modulo`
  ADD CONSTRAINT `fk_rol_modulo_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rol_modulo_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `fk_rol_permiso_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id_permiso`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rol_permiso_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `servicios_hospitalarios`
--
ALTER TABLE `servicios_hospitalarios`
  ADD CONSTRAINT `fk_servicios_departamentos` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `transferencias`
--
ALTER TABLE `transferencias`
  ADD CONSTRAINT `fk_transferencias_movimiento` FOREIGN KEY (`id_movimiento`) REFERENCES `movimientos` (`id_movimiento`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `ubicaciones`
--
ALTER TABLE `ubicaciones`
  ADD CONSTRAINT `fk_ubicaciones_departamentos` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ubicaciones_modulos` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
