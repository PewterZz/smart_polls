import {
    $update,
    $query,
    Record,
    match,
    Result,
    int,
    Variant,
    Vec,
    StableBTreeMap,
    nat64,
    Opt,
    ic
  } from 'azle';
  import { v4 as uuidv4 } from 'uuid';
  
  type Poll = Record<{
    pollId: string;
    question: string;
    options: Vec<string>;
    votes: Vec<string>;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
  }>;
  
  type PollPayload = Record<{
    question: string;
    options: Vec<string>;
    votes: Vec<string>;
  }>;
  
  const polls = new StableBTreeMap<string, Poll>(0, 44, 1024);
  
  
  $update
  export function createPoll(payload: PollPayload): Result<Poll, string> {
    try {
    const id = uuidv4();
  
    return match(polls.get(id), {
      Some: () => Result.Err<Poll, string>("Poll ID already exists"),
      None: () => {
        const newPoll: Poll = {
          pollId: id,
          question: payload.question,
          options: payload.options,
          votes: [],
          createdAt: ic.time(),
          updatedAt: Opt.None,
        };
        polls.insert(id, newPoll);
        return Result.Ok<Poll, string>(newPoll);
      },
    });
  } catch (error) {
    return Result.Err<Poll, string>(`Error while creating poll: ${error}`);
  }
  }
  
  $update
  export function vote(pollId: string, option: string): Result<Poll, string> {
     // Check if the pollId exists
     if (!pollId) {
      return Result.Err<Poll, string>('PollId not found');
    }
     if (!option) {
      return Result.Err<Poll, string>('option not found');
    }
  try {
    return match(polls.get(pollId), {
      Some: (poll) => {
        if (!poll.options.includes(option)) {
          return Result.Err<Poll, string>("Invalid option");
        }
  
        const updatedVotes = poll.votes.concat([option]);
        polls.insert(pollId, { ...poll, votes: updatedVotes });
  
        return Result.Ok<Poll, string>(poll);
      },
      None: () => Result.Err<Poll, string>("Poll not found"),
    });
  } catch (error) {
    return Result.Err<Poll, string>(`Error while voting poll: ${error}`);
  }
  }
  
  $query
  export function getPoll(pollId: string): Result<Poll, string> {
     // Check if the pollId exists
     if (!pollId) {
      return Result.Err<Poll, string>('PollId not found');
    }
  try {
    return match(polls.get(pollId), {
      Some: (poll) => Result.Ok<Poll, string>(poll),
      None: () => Result.Err<Poll, string>("Poll not found"),
    });
  } catch (error) {
    return Result.Err<Poll, string>(`Error retrieving poll: ${error}`);
  }
  }
  
  $query
  export function getPollResults(pollId: string): Result<Variant<{ ok: Vec<Record<{ option: string; count: int }>>; err: string }>, string> {
    // Check if the pollId exists
    if (!pollId) {
      return Result.Err('PollId not found');
    }
  
    return match(polls.get(pollId), {
      Some: (poll) => {
        const results = poll.votes.reduce((acc, option) => {
          const existingOption = acc.find((entry) => entry.option === option);
          if (existingOption) {
            existingOption.count += BigInt(1);
          } else {
            acc.push({ option, count: BigInt(1) });
          }
          return acc;
        }, [] as { option: string; count: int }[]);
  
        return Result.Ok<Variant<{ ok: Vec<Record<{ option: string; count: int }>>; err: string }>, string>({ ok: results });
      },
      None: () => Result.Ok<Variant<{ ok: Vec<Record<{ option: string; count: int }>>; err: string }>, string>({ err: 'Poll not found' }),
    });
  }
  
  
  // Function to allow the use of uuid
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
  