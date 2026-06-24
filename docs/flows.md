# System Workflows and Flows

This document details the core business workflows of the Hospital Management System.

## 1. Appointment Booking Flow

This flowchart illustrates the step-by-step logic of requesting, validating, and approving an appointment.

```text
       [Patient: Request Appointment]
           │ (Doctor, Date, Slot)
           ▼
     [System: Validate Slot Overlaps]
           │
           ├─► (Slot Taken) ─► [Return: Slot Unavailable]
           │
           ▼ (Slot Free)
     [System: Save as "Pending"]
           │
           ▼
     [System: Notify Doctor of Request]
           │
           ▼
       [Doctor: Review Request]
           │
           ├─► (Approve)
           │     │
           │     ▼
           │   [System: Update status to "Approved"]
           │     │
           │     ▼
           │   [System: Notify Patient: Confirmed]
           │
           └─► (Cancel/Reject)
                 │
                 ▼
               [System: Update status to "Cancelled"]
                 │
                 ▼
               [System: Notify Patient: Cancelled]
```

## 2. Prescription Flow (Strictly Linked to Appointment)

This flowchart details how a Doctor writes a prescription for a Patient, showing the validation checks for the associated appointment.

```text
       [Doctor: Initiate Prescription Creation]
           │ (Appointment ID, Patient ID)
           ▼
     [System: Validate Appointment Status]
           │
           ├─► (Not Found / Not Assigned to Doctor) ─► [Return: Unauthorized]
           │
           ├─► (Appointment Not Approved/Active) ────► [Return: Invalid Status]
           │
           ▼ (Valid & Active Appointment)
       [Doctor: Input Prescription Details]
           │ (Medications, Dosage, Instructions)
           ▼
     [System: Save Prescription & Complete Appt]
           │
           ▼
     [System: Update Appointment Status to "Completed"]
           │
           ▼
     [System: Save to DB & Trigger Notification]
           │
           ▼
       [Patient: Receives Notification & Accesses Prescription]
```

## 3. Insurance Claim Flow (Hospital-Initiated)

This flowchart outlines the automated process where the system submits claims upon appointment completion, followed by review by an Insurance Agent.

```text
       [System: Appointment Marked "Completed"]
           │
           ▼
     [System: Check Patient Active Insurance Policy]
           │
           ├─► (No Active Policy) ─► [System: Generate Patient Full Invoice]
           │
           ▼ (Active Policy Found)
     [System: Generate Claim (Status: "Pending Review")]
           │
           ▼
     [System: Notify Insurance Agent of Claim]
           │
           ▼
       [Insurance Agent: Review Claim]
           │
           ├─► (Approve Claim)
           │     │
           │     ▼
           │   [System: Update status to "Approved"]
           │     │
           │     ▼
           │   [System: Calculate covered amount & Co-pay]
           │     │
           │     ▼
           │   [System: Send remaining invoice to Patient]
           │
           └─► (Reject Claim)
                 │
                 ▼
               [System: Update status to "Rejected"]
                 │
                 ▼
               [System: Send full invoice to Patient]
```

## 4. Billing Flow (Hybrid Payment)

This flowchart outlines how invoices are generated and settled, supporting both online self-service payments and in-person receptionist-managed payments.

```text
       [System: Invoice Generated (Full or Co-pay)]
           │
           ▼
       [System: Set Invoice Status to "Unpaid"]
           │
           ▼
       [System: Notify Patient of Unpaid Balance]
           │
           ├─────────────────────────┐
           ▼ (Option A: Online)      ▼ (Option B: In-Person)
     [Patient: Open Web Portal]  [Patient: Pay at Front Desk]
           │                         │ (Cash or Physical Card)
           ▼                         ▼
     [Patient: Submit Payment]   [Receptionist: Record Manual Payment]
           │                         │ (Select Cash/Card Method)
           ▼                         ▼
     [System: Process Mock Gate] [System: Log Transaction]
           │                         │
           └───────────┬─────────────┘
                       │
                       ▼
         [System: Mark Invoice "Paid"]
                       │
                       ▼
         [System: Generate PDF Receipt]
                       │
                       ▼
         [System: Notify Patient of Receipt]
```





