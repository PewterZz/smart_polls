import { Canister, query, update, text, Variant, int } from 'azle';

type Poll = {
    question: string;
    options: string[];
    votes: Map<string, int>;
};

let polls = new Map<string, Poll>();

export default Canister({
    createPoll: update([text, text, [text]], Void, (id, question, options) => {
        if (polls.has(id)) {
            throw new Error("Poll ID already exists");
        }

        polls.set(id, {
            question: question,
            options: options,
            votes: new Map<string, int>()
        });
    }),

    vote: update([text, text], Void, (pollId, option) => {
        const poll = polls.get(pollId);
        if (!poll) {
            throw new Error("Poll not found");
        }

        if (!poll.options.includes(option)) {
            throw new Error("Invalid option");
        }

        let currentVotes = poll.votes.get(option) || 0;
        poll.votes.set(option, currentVotes + 1);
    }),

    getPollResults: query([text], Variant({ok: [record { option: text; count: int }], err: text}), (pollId) => {
        const poll = polls.get(pollId);
        if (!poll) {
            return { err: "Poll not found" };
        }

        let results = Array.from(poll.votes, ([option, count]) => ({ option, count }));
        return { ok: results };
    }),

    getPoll: query([text], Variant({ok: Poll, err: text}), (pollId) => {
        const poll = polls.get(pollId);
        if (!poll) {
            return { err: "Poll not found" };
        }

        return { ok: poll };
    })
});
