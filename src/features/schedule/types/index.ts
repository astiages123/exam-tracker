export interface ScheduleItem {
    time: string;
    subject: string;
}

export interface WeeklySchedule {
    [day: string]: ScheduleItem[];
}
