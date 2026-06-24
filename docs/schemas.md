# Database Schemas

This document defines the relational database schemas for our tables. Since we plan to move to microservices, we use UUIDs for primary keys to prevent ID collisions.

## 1. `users` Table

This table manages user authentication, credentials, and role-based access control.

* **id**
  * Type: `UUID`
  * Constraints: `PRIMARY KEY`, `DEFAULT gen_random_uuid()`
  * Description: Unique identifier for the user account.

* **email**
  * Type: `VARCHAR(255)`
  * Constraints: `UNIQUE`, `NOT NULL`
  * Description: The user's login email address.

* **password_hash**
  * Type: `VARCHAR(255)`
  * Constraints: `NOT NULL`
  * Description: The hashed password (bcrypt).

* **role**
  * Type: `VARCHAR(50)`
  * Constraints: `NOT NULL`
  * Description: Access role: `patient`, `doctor`, `receptionist`, `insurance_agent`, `admin`.

* **first_name**
  * Type: `VARCHAR(100)`
  * Constraints: `NOT NULL`
  * Description: The user's legal first name.

* **last_name**
  * Type: `VARCHAR(100)`
  * Constraints: `NOT NULL`
  * Description: The user's legal last name.

* **phone**
  * Type: `VARCHAR(20)`
  * Constraints: `NULL`
  * Description: Contact phone number.

* **created_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the user registered.

* **updated_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the user profile was last updated.

## 2. `patients` Table

This table stores profile details specific to patients, linked one-to-one to a record in the `users` table.

* **id**
  * Type: `UUID`
  * Constraints: `PRIMARY KEY`, `DEFAULT gen_random_uuid()`
  * Description: Unique identifier for the patient profile.

* **user_id**
  * Type: `UUID`
  * Constraints: `FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE`, `UNIQUE`, `NOT NULL`
  * Description: Links the patient profile to their auth credentials in `users`.

* **date_of_birth**
  * Type: `DATE`
  * Constraints: `NOT NULL`
  * Description: Patient's date of birth.

* **gender**
  * Type: `VARCHAR(20)`
  * Constraints: `NOT NULL`
  * Description: Patient's gender (e.g., Male, Female, Other).

* **address**
  * Type: `TEXT`
  * Constraints: `NULL`
  * Description: Patient's residential address.

* **insurance_provider**
  * Type: `VARCHAR(100)`
  * Constraints: `NULL`
  * Description: The name of the patient's insurance provider (e.g., BlueCross).

* **insurance_policy_number**
  * Type: `VARCHAR(100)`
  * Constraints: `NULL`
  * Description: The patient's insurance policy identifier number.

* **created_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the profile was created.

* **updated_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the profile was last updated.

## 3. `doctors` Table

This table stores profile details specific to doctors, linked one-to-one to a record in the `users` table.

* **id**
  * Type: `UUID`
  * Constraints: `PRIMARY KEY`, `DEFAULT gen_random_uuid()`
  * Description: Unique identifier for the doctor profile.

* **user_id**
  * Type: `UUID`
  * Constraints: `FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE`, `UNIQUE`, `NOT NULL`
  * Description: Links the doctor profile to their auth credentials in `users`.

* **specialization**
  * Type: `VARCHAR(100)`
  * Constraints: `NOT NULL`
  * Description: Doctor's specialty (e.g., Cardiology, Pediatrics).

* **license_number**
  * Type: `VARCHAR(100)`
  * Constraints: `UNIQUE`, `NOT NULL`
  * Description: Doctor's professional medical license registration number.

* **consultation_fee**
  * Type: `NUMERIC(10, 2)`
  * Constraints: `NOT NULL`
  * Description: Consultation charge rate for a standard visit.

* **bio**
  * Type: `TEXT`
  * Constraints: `NULL`
  * Description: Brief bio or summary of professional experience.

* **created_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the profile was created.

* **updated_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the profile was last updated.

## 4. `appointments` Table

This table manages booking transaction records, scheduling slots, and approval statuses between patients and doctors.

* **id**
  * Type: `UUID`
  * Constraints: `PRIMARY KEY`, `DEFAULT gen_random_uuid()`
  * Description: Unique identifier for the appointment booking.

* **patient_id**
  * Type: `UUID`
  * Constraints: `FOREIGN KEY REFERENCES patients(id) ON DELETE CASCADE`, `NOT NULL`
  * Description: Links to the Patient profile booking the appointment.

* **doctor_id**
  * Type: `UUID`
  * Constraints: `FOREIGN KEY REFERENCES doctors(id) ON DELETE CASCADE`, `NOT NULL`
  * Description: Links to the Doctor profile being booked.

* **appointment_date**
  * Type: `DATE`
  * Constraints: `NOT NULL`
  * Description: The calendar date scheduled for the appointment (e.g. YYYY-MM-DD).

* **start_time**
  * Type: `TIME`
  * Constraints: `NOT NULL`
  * Description: The starting time of the appointment slot (e.g. HH:MM:SS).

* **end_time**
  * Type: `TIME`
  * Constraints: `NOT NULL`
  * Description: The ending time of the appointment slot (e.g. HH:MM:SS).

* **status**
  * Type: `VARCHAR(50)`
  * Constraints: `NOT NULL`, `CHECK (status IN ('pending', 'approved', 'cancelled', 'completed'))`
  * Description: Workflow status of the booking:
    * `pending`: Patient requested slot, awaiting review.
    * `approved`: Doctor accepted the slot.
    * `cancelled`: Doctor or Patient cancelled the slot.
    * `completed`: Visit is finished, doctor generated prescription.

* **reason**
  * Type: `TEXT`
  * Constraints: `NULL`
  * Description: Patient-provided description of symptoms or reason for visit.

* **created_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the booking request was submitted.

* **updated_at**
  * Type: `TIMESTAMP`
  * Constraints: `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP`
  * Description: Timestamp when the appointment details or status changed.



