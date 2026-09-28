import torch
from torch import nn


class KnowledgeTracer(nn.Module):
    """GRU of previous concept/outcome events; target metadata contains no answer."""

    def __init__(self, concepts=9):
        super().__init__()
        self.events = nn.Embedding(2 * concepts + 1, 16, padding_idx=0)
        self.gru = nn.GRU(16, 32, batch_first=True)
        self.head = nn.Sequential(nn.Linear(32 + 9, 32), nn.ReLU(), nn.Linear(32, 1))

    def forward(self, tokens, lengths, features):
        states, _ = self.gru(self.events(tokens))
        last = states[torch.arange(len(tokens)), lengths - 1]
        return self.head(torch.cat([last, features], dim=1)).squeeze(1)
