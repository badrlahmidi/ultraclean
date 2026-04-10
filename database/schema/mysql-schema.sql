/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: ticket.status_changed, payment.processed, user.login',
  `subject_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ex: App\\Models\\Ticket',
  `subject_id` bigint unsigned DEFAULT NULL COMMENT 'ID de l''entité concernée',
  `properties` json DEFAULT NULL COMMENT 'Ex: {"before":{"status":"pending"},"after":{"status":"paid"}}',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activity_subject` (`subject_type`,`subject_id`),
  KEY `activity_logs_user_id_index` (`user_id`),
  KEY `activity_logs_action_index` (`action`),
  KEY `activity_logs_created_at_index` (`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ulid` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` bigint unsigned DEFAULT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `ticket_id` bigint unsigned DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `estimated_duration` smallint unsigned NOT NULL DEFAULT '30',
  `vehicle_plate` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_brand` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_brand_id` bigint unsigned DEFAULT NULL,
  `vehicle_model_id` bigint unsigned DEFAULT NULL,
  `vehicle_type_id` bigint unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `cancelled_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','confirmed','arrived','in_progress','completed','cancelled','no_show') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `source` enum('walk_in','phone','online','whatsapp','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'phone',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointments_ulid_unique` (`ulid`),
  KEY `appointments_client_id_foreign` (`client_id`),
  KEY `appointments_created_by_foreign` (`created_by`),
  KEY `appointments_ticket_id_foreign` (`ticket_id`),
  KEY `appointments_vehicle_brand_id_foreign` (`vehicle_brand_id`),
  KEY `appointments_vehicle_model_id_foreign` (`vehicle_model_id`),
  KEY `appointments_vehicle_type_id_foreign` (`vehicle_type_id`),
  KEY `appointments_scheduled_at_index` (`scheduled_at`),
  KEY `appointments_assigned_to_scheduled_at_index` (`assigned_to`,`scheduled_at`),
  KEY `appointments_status_index` (`status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nom complet du client',
  `is_company` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'false = Particulier, true = Entreprise (ICE obligatoire)',
  `ice` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Identifiant Commun de l''Entreprise — 15 chiffres — NULL si particulier',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_plate` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Plaque mémorisée — format libre',
  `preferred_vehicle_type_id` bigint unsigned DEFAULT NULL,
  `loyalty_tier` enum('standard','silver','gold','platinum') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `loyalty_points` int unsigned NOT NULL DEFAULT '0',
  `total_visits` int unsigned NOT NULL DEFAULT '0',
  `total_spent_cents` bigint unsigned NOT NULL DEFAULT '0' COMMENT 'Agrégat en centimes MAD',
  `last_visit_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Notes internes caissier',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_email_unique` (`email`),
  UNIQUE KEY `clients_phone_unique` (`phone`),
  UNIQUE KEY `clients_ice_unique` (`ice`),
  KEY `clients_preferred_vehicle_type_id_foreign` (`preferred_vehicle_type_id`),
  KEY `clients_phone_index` (`phone`),
  KEY `clients_vehicle_plate_index` (`vehicle_plate`),
  KEY `clients_loyalty_tier_index` (`loyalty_tier`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` smallint unsigned NOT NULL DEFAULT '1',
  `unit_price_cents` bigint unsigned NOT NULL DEFAULT '0',
  `discount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `line_total_cents` bigint unsigned NOT NULL DEFAULT '0',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_lines_invoice_id_foreign` (`invoice_id`),
  KEY `invoice_lines_service_id_foreign` (`service_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `ticket_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_tickets_invoice_id_ticket_id_unique` (`invoice_id`,`ticket_id`),
  KEY `invoice_tickets_ticket_id_foreign` (`ticket_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ulid` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quote_id` bigint unsigned DEFAULT NULL,
  `client_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_city` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_zip` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_ice` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal_cents` bigint unsigned NOT NULL DEFAULT '0',
  `discount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_cents` bigint unsigned NOT NULL DEFAULT '0',
  `total_cents` bigint unsigned NOT NULL DEFAULT '0',
  `amount_paid_cents` bigint unsigned NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `pdf_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_ulid_unique` (`ulid`),
  UNIQUE KEY `invoices_invoice_number_unique` (`invoice_number`),
  KEY `invoices_created_by_foreign` (`created_by`),
  KEY `invoices_client_id_status_index` (`client_id`,`status`),
  KEY `invoices_status_index` (`status`),
  KEY `invoices_quote_id_index` (`quote_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `loyalty_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyalty_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `ticket_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `type` enum('earned','redeemed','adjusted','expired') COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` int NOT NULL,
  `balance_after` int unsigned NOT NULL DEFAULT '0',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loyalty_transactions_ticket_id_foreign` (`ticket_id`),
  KEY `loyalty_transactions_created_by_foreign` (`created_by`),
  KEY `loyalty_transactions_client_id_created_at_index` (`client_id`,`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint unsigned NOT NULL,
  `amount_cents` int unsigned NOT NULL COMMENT 'Montant total encaissé en centimes MAD',
  `method` enum('cash','card','mobile','mixed') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Méthode de paiement principale',
  `amount_cash_cents` int unsigned NOT NULL DEFAULT '0',
  `amount_card_cents` int unsigned NOT NULL DEFAULT '0',
  `amount_mobile_cents` int unsigned NOT NULL DEFAULT '0',
  `amount_wire_cents` int unsigned NOT NULL DEFAULT '0',
  `change_given_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Monnaie rendue = montant_remis - total_dû',
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Référence TPE ou transaction mobile',
  `processed_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_ticket_id_index` (`ticket_id`),
  KEY `payments_processed_by_index` (`processed_by`),
  KEY `payments_created_at_index` (`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Code promo (ex: ETE25)',
  `label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Description lisible',
  `type` enum('percent','fixed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent' COMMENT 'percent = %, fixed = MAD centimes',
  `value` int unsigned NOT NULL DEFAULT '0' COMMENT 'Valeur: 1000 = 10% ou 10 MAD (centimes)',
  `min_amount_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Montant min du ticket pour appliquer',
  `max_uses` int unsigned DEFAULT NULL COMMENT 'Null = illimité',
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `valid_from` timestamp NULL DEFAULT NULL,
  `valid_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promotions_code_unique` (`code`),
  KEY `promotions_is_active_valid_from_valid_until_index` (`is_active`,`valid_from`,`valid_until`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `quote_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `quote_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` smallint unsigned NOT NULL DEFAULT '1',
  `unit_price_cents` bigint unsigned NOT NULL DEFAULT '0',
  `discount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `line_total_cents` bigint unsigned NOT NULL DEFAULT '0',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quote_lines_quote_id_foreign` (`quote_id`),
  KEY `quote_lines_service_id_foreign` (`service_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ulid` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quote_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `billing_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_city` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_zip` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_ice` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal_cents` bigint unsigned NOT NULL DEFAULT '0',
  `discount_cents` bigint unsigned NOT NULL DEFAULT '0',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_cents` bigint unsigned NOT NULL DEFAULT '0',
  `total_cents` bigint unsigned NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `valid_until` date DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `pdf_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotes_ulid_unique` (`ulid`),
  UNIQUE KEY `quotes_quote_number_unique` (`quote_number`),
  KEY `quotes_created_by_foreign` (`created_by`),
  KEY `quotes_client_id_status_index` (`client_id`,`status`),
  KEY `quotes_status_index` (`status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_stock_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_stock_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_id` bigint unsigned NOT NULL,
  `stock_product_id` bigint unsigned NOT NULL,
  `quantity_per_use` decimal(10,3) NOT NULL DEFAULT '1.000' COMMENT 'Quantité consommée par prestation',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_stock_products_service_id_stock_product_id_unique` (`service_id`,`stock_product_id`),
  KEY `service_stock_products_stock_product_id_foreign` (`stock_product_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_vehicle_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_vehicle_prices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_id` bigint unsigned NOT NULL,
  `vehicle_type_id` bigint unsigned NOT NULL,
  `price_cents` int unsigned NOT NULL COMMENT 'Prix en centimes MAD. Ex: 4500 = 45,00 MAD',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_service_vehicle_price` (`service_id`,`vehicle_type_id`),
  KEY `service_vehicle_prices_vehicle_type_id_foreign` (`vehicle_type_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: Lavage Extérieur, Lavage Complet, Aspiration',
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#3B82F6' COMMENT 'Code HEX pour badge UI',
  `duration_minutes` tinyint unsigned NOT NULL DEFAULT '15' COMMENT 'Durée estimée pour planification',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  `category` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT 'Lavage' COMMENT 'Groupe d''affichage UI — ex: Lavage, Esthétique, Détailing',
  `price_type` enum('fixed','variant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed' COMMENT 'fixed = prix unique, variant = prix par catégorie taille',
  `base_price_cents` int unsigned DEFAULT NULL COMMENT 'Prix fixe unique en centimes MAD (si price_type=fixed)',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_is_active_sort_order_index` (`is_active`,`sort_order`),
  KEY `services_category_index` (`category`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Clé unique — ex: app.name, loyalty.points_per_mad',
  `value` text COLLATE utf8mb4_unicode_ci COMMENT 'Valeur sérialisée selon le type',
  `type` enum('string','integer','boolean','json','float') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `group` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general' COMMENT 'general|fiscal|loyalty|display|shift',
  `label` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Libellé lisible pour le panneau admin',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`),
  KEY `settings_group_index` (`group`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `opened_at` timestamp NOT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `opening_cash_cents` int unsigned NOT NULL DEFAULT '0',
  `closing_cash_cents` int unsigned NOT NULL DEFAULT '0',
  `expected_cash_cents` int unsigned NOT NULL DEFAULT '0',
  `difference_cents` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shifts_user_id_closed_at_index` (`user_id`,`closed_at`),
  KEY `shifts_opened_at_index` (`opened_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stock_product_id` bigint unsigned NOT NULL,
  `type` enum('in','out','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'in=entrée, out=sortie, adjustment=ajustement inventaire',
  `quantity` decimal(10,3) NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ex: numéro de ticket, BL fournisseur',
  `user_id` bigint unsigned DEFAULT NULL,
  `ticket_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stock_movements_user_id_foreign` (`user_id`),
  KEY `stock_movements_ticket_id_foreign` (`ticket_id`),
  KEY `stock_movements_stock_product_id_created_at_index` (`stock_product_id`,`created_at`),
  KEY `stock_movements_type_index` (`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nom du produit (ex: Shampoing carrosserie)',
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` enum('produit_chimique','consommable','outil','autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'produit_chimique',
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'L' COMMENT 'Unité: L, kg, unité, rouleau, bidon, carton',
  `current_quantity` decimal(10,3) NOT NULL DEFAULT '0.000' COMMENT 'Quantité actuelle en stock',
  `min_quantity` decimal(10,3) NOT NULL DEFAULT '1.000' COMMENT 'Seuil alerte stock bas',
  `cost_price_cents` int unsigned NOT NULL DEFAULT '0' COMMENT 'Prix d''achat en centimes',
  `supplier` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_products_sku_unique` (`sku`),
  KEY `stock_products_is_active_category_index` (`is_active`,`category`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint unsigned NOT NULL,
  `price_variant_id` bigint unsigned DEFAULT NULL,
  `price_variant_label` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Snapshot du nom catégorie — ex: Petite voiture',
  `service_id` bigint unsigned NOT NULL,
  `service_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Snapshot du nom au moment de la vente',
  `unit_price_cents` int unsigned NOT NULL COMMENT 'Snapshot du prix unitaire en centimes MAD',
  `quantity` tinyint unsigned NOT NULL DEFAULT '1',
  `discount_cents` int unsigned NOT NULL DEFAULT '0',
  `line_total_cents` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ticket_services_ticket_id_index` (`ticket_id`),
  KEY `ticket_services_service_id_index` (`service_id`),
  KEY `ticket_services_price_variant_id_foreign` (`price_variant_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ulid` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant public URL-safe (Str::ulid())',
  `ticket_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: TK-20260328-0001',
  `status` enum('pending','in_progress','paused','blocked','completed','payment_pending','paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `vehicle_type_id` bigint unsigned DEFAULT NULL,
  `vehicle_plate` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_brand` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Marque et modèle saisie libre — ex: Toyota Yaris',
  `vehicle_brand_id` bigint unsigned DEFAULT NULL,
  `vehicle_model_id` bigint unsigned DEFAULT NULL,
  `client_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `paid_by` bigint unsigned DEFAULT NULL,
  `shift_id` bigint unsigned DEFAULT NULL,
  `subtotal_cents` int unsigned NOT NULL DEFAULT '0',
  `discount_cents` int unsigned NOT NULL DEFAULT '0',
  `total_cents` int unsigned NOT NULL DEFAULT '0',
  `loyalty_points_earned` int unsigned NOT NULL DEFAULT '0',
  `loyalty_points_used` int unsigned NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `estimated_duration` smallint unsigned DEFAULT NULL COMMENT 'Durée totale estimée en minutes (auto ou override)',
  `due_at` timestamp NULL DEFAULT NULL COMMENT 'Heure de fin prévue = created_at + estimated_duration',
  `payment_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mode paiement prevu: cash,card,wire,advance,credit',
  `cancelled_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `paused_at` timestamp NULL DEFAULT NULL,
  `total_paused_seconds` int unsigned NOT NULL DEFAULT '0',
  `pause_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_initiated_at` timestamp NULL DEFAULT NULL,
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tickets_ulid_unique` (`ulid`),
  UNIQUE KEY `tickets_ticket_number_unique` (`ticket_number`),
  KEY `tickets_vehicle_type_id_foreign` (`vehicle_type_id`),
  KEY `tickets_client_id_foreign` (`client_id`),
  KEY `tickets_created_by_foreign` (`created_by`),
  KEY `tickets_paid_by_foreign` (`paid_by`),
  KEY `tickets_status_created_at_index` (`status`,`created_at`),
  KEY `tickets_shift_id_status_index` (`shift_id`,`status`),
  KEY `tickets_assigned_to_status_index` (`assigned_to`,`status`),
  KEY `tickets_vehicle_plate_index` (`vehicle_plate`),
  KEY `tickets_paid_at_index` (`paid_at`),
  KEY `tickets_vehicle_brand_id_index` (`vehicle_brand_id`),
  KEY `tickets_vehicle_model_id_index` (`vehicle_model_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','caissier','laveur') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'caissier',
  `pin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PIN 4 chiffres haché — connexion rapide caisse',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Désactiver sans supprimer',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `avatar` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`),
  KEY `users_is_active_index` (`is_active`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vehicle_brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_brands` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: Dacia, Peugeot, Renault, Toyota',
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Identifiant URL-safe — ex: dacia, peugeot',
  `logo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Chemin relatif Storage — ex: brands/dacia.svg',
  `country` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pays d''origine — ex: France, Japon (affichage informatif)',
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Ordre d''affichage dans la grille de sélection',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Masquer une marque sans la supprimer',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_brands_name_unique` (`name`),
  UNIQUE KEY `vehicle_brands_slug_unique` (`slug`),
  KEY `vehicle_brands_is_active_sort_order_index` (`is_active`,`sort_order`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vehicle_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_models` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `brand_id` bigint unsigned NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: Sandero, Logan, Duster, 208, 308, 3008',
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: sandero, logan, 208',
  `suggested_vehicle_type_id` bigint unsigned DEFAULT NULL,
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_models_brand_id_slug_unique` (`brand_id`,`slug`),
  KEY `vehicle_models_suggested_vehicle_type_id_foreign` (`suggested_vehicle_type_id`),
  KEY `vehicle_models_brand_id_is_active_sort_order_index` (`brand_id`,`is_active`,`sort_order`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: Citadine, SUV, Utilitaire, Moto',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: citadine, suv, utilitaire, moto',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nom icône Lucide — ex: car, truck, bike',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_types_slug_unique` (`slug`),
  KEY `vehicle_types_is_active_index` (`is_active`),
  KEY `vehicle_types_sort_order_index` (`sort_order`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2026_03_28_000001_create_settings_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2026_03_28_000002_create_vehicle_types_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2026_03_28_000003_create_services_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2026_03_28_000004_create_service_vehicle_prices_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2026_03_28_000005_create_clients_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2026_03_28_000006_create_shifts_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2026_03_28_000007_create_tickets_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2026_03_28_000008_create_ticket_services_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2026_03_28_000009_create_payments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2026_03_28_000010_create_activity_logs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2026_03_28_000011_add_vehicle_brand_to_tickets',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2026_03_28_000012_add_price_type_to_services',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2026_03_28_000013_add_price_variant_to_ticket_services',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2026_03_28_000014_make_clients_phone_nullable',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2026_03_28_000015_make_tickets_vehicle_type_nullable',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2026_03_28_000016_create_vehicle_brands_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2026_03_28_000017_create_vehicle_models_table',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2026_03_28_000018_add_ice_company_to_clients',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2026_03_28_000019_add_vehicle_brand_model_ids_to_tickets',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2026_03_28_000020_add_category_to_services',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2026_03_29_000021_add_duration_to_services_and_tickets',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2026_03_30_000022_create_promotions_table',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2026_03_30_000023_create_stock_products_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2026_03_30_000024_create_stock_movements_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2026_03_30_000025_create_service_stock_products_table',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2026_03_30_000026_create_loyalty_transactions_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'2026_03_31_051631_add_payment_mode_to_tickets',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'2026_03_31_060804_add_amount_wire_cents_to_payments',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2026_04_01_000032_add_state_machine_v2_to_tickets',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'2026_04_01_000033_create_appointments_table',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2026_04_01_000034_create_quotes_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2026_04_01_000035_create_quote_lines_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2026_04_01_000036_create_invoices_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2026_04_01_000037_create_invoice_lines_and_pivot_table',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2026_04_01_000038_extend_settings_type_enum',16);
