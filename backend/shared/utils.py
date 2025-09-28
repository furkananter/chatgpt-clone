import re
import unicodedata
from typing import Iterable, Iterator, Sequence, TypeVar

T = TypeVar("T")


def slugify(value: str) -> str:
    value = str(value)
    value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value)


def chunked(iterable: Sequence[T], size: int) -> Iterator[Sequence[T]]:
    for index in range(0, len(iterable), size):
        yield iterable[index : index + size]
