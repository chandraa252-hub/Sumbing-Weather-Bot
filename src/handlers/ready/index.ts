import { environment } from "../../environment";
import { client } from "../../discord";
import { timerRepo, sleepcallRepo } from "../../persistence";
import logger from "../../services/logger";
import { startTimerLoop } from "../../timerLoop";
import { initCommands } from "./slashCommand";

export async function handleReady() {
    startTimerLoop();

    logger.info(undefined, `Main Bot: ${environment.mainBot}`);
    logger.info(undefined, `Bot Id: ${environment.botId}`);

    const guilds = client.guilds.valueOf();
    logger.info(undefined, `Member of ${guilds.size} server(s)`);

    const timerKeys = await timerRepo.getAll();
    logger.info(undefined, `${timerKeys.length} running timer(s)`);

    const staleSleepcalls = await sleepcallRepo.getAll();
    if (staleSleepcalls.length > 0) {
        await Promise.all(staleSleepcalls.map((s) => sleepcallRepo.remove(s.guildId)));
        logger.info(undefined, `Cleared ${staleSleepcalls.length} stale sleepcall(s) from Redis`);
    }

    await initCommands();
}
