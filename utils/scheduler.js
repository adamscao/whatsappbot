// utils/scheduler.js
// Task scheduler for handling timed events and reminders

const schedule = require('node-schedule');
const logger = require('./logger');

// Store scheduled jobs
const scheduledJobs = new Map();

// Initialize the scheduler
function initScheduler() {
    logger.info('Initializing scheduler');
    // Clear any existing scheduled jobs on startup
    cancelAllJobs();
}

// Schedule a job to run at a specific time
function scheduleJob(jobId, date, callback) {
    try {
        if (!jobId || !date || !callback) {
            logger.error('Invalid parameters for scheduling job');
            return false;
        }
        
        // Cancel existing job with same ID if it exists
        cancelJob(jobId);
        
        // Schedule new job
        const job = schedule.scheduleJob(date, async () => {
            try {
                logger.debug(`Executing scheduled job: ${jobId}`);
                await callback();
                logger.debug(`Job ${jobId} executed successfully`);
            } catch (error) {
                logger.error(`Error executing job ${jobId}: ${error.message}`, { error });
            } finally {
                // Clean up after job execution
                scheduledJobs.delete(jobId);
            }
        });
        
        if (job) {
            scheduledJobs.set(jobId, job);
            logger.debug(`Scheduled job ${jobId} for ${date.toISOString()}`);
            return true;
        } else {
            logger.error(`Failed to schedule job ${jobId}`);
            return false;
        }
    } catch (error) {
        logger.error(`Error scheduling job ${jobId}: ${error.message}`, { error });
        return false;
    }
}

// Schedule a job to run at a regular interval
function scheduleRecurringJob(jobId, rule, callback) {
    try {
        if (!jobId || !rule || !callback) {
            logger.error('Invalid parameters for scheduling recurring job');
            return false;
        }
        
        // Cancel existing job with same ID if it exists
        cancelJob(jobId);
        
        // Schedule new recurring job
        const job = schedule.scheduleJob(rule, async () => {
            try {
                logger.debug(`Executing recurring job: ${jobId}`);
                await callback();
                logger.debug(`Recurring job ${jobId} executed successfully`);
            } catch (error) {
                logger.error(`Error executing recurring job ${jobId}: ${error.message}`, { error });
            }
        });
        
        if (job) {
            scheduledJobs.set(jobId, job);
            logger.debug(`Scheduled recurring job ${jobId} with rule: ${JSON.stringify(rule)}`);
            return true;
        } else {
            logger.error(`Failed to schedule recurring job ${jobId}`);
            return false;
        }
    } catch (error) {
        logger.error(`Error scheduling recurring job ${jobId}: ${error.message}`, { error });
        return false;
    }
}

// Cancel a scheduled job
function cancelJob(jobId) {
    try {
        if (!jobId) {
            logger.error('No job ID provided for cancellation');
            return false;
        }
        
        const job = scheduledJobs.get(jobId);
        if (job) {
            job.cancel();
            scheduledJobs.delete(jobId);
            logger.debug(`Cancelled job: ${jobId}`);
            return true;
        }
        
        return false;
    } catch (error) {
        logger.error(`Error cancelling job ${jobId}: ${error.message}`, { error });
        return false;
    }
}

// Cancel all scheduled jobs
function cancelAllJobs() {
    try {
        let count = 0;
        
        for (const [jobId, job] of scheduledJobs.entries()) {
            job.cancel();
            scheduledJobs.delete(jobId);
            count++;
        }
        
        logger.debug(`Cancelled all scheduled jobs (${count} jobs)`);
        return true;
    } catch (error) {
        logger.error(`Error cancelling all jobs: ${error.message}`, { error });
        return false;
    }
}

// Schedule a reminder
function scheduleReminder(reminderId, date, callback) {
    try {
        if (!reminderId || !date || !callback) {
            logger.error('Invalid parameters for scheduling reminder');
            return false;
        }
        
        const jobId = `reminder_${reminderId}`;
        return scheduleJob(jobId, date, callback);
    } catch (error) {
        logger.error(`Error scheduling reminder ${reminderId}: ${error.message}`, { error });
        return false;
    }
}

module.exports = {
    initScheduler,
    scheduleJob,
    scheduleRecurringJob,
    cancelJob,
    cancelAllJobs,
    scheduleReminder
};